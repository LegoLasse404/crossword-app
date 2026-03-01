import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { uuidSchema } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = rateLimit(req, { key: "crosswords-get-one", max: 120, windowMs: 60_000 });
    if (rl) return rl;

    const auth = await requireApiUser(req);
    if ("error" in auth) return auth.error;

    const { id } = await params;

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("crosswords")
      .select(
        `
        *,
        crossword_clues(*)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    const isOwner = data.user_id === auth.user.id;
    if (!isOwner) {
      const { data: shareRow, error: shareError } = await supabaseAdmin
        .from("crossword_shares")
        .select("id")
        .eq("crossword_id", id)
        .eq("shared_with_user_id", auth.user.id)
        .maybeSingle();

      if (shareError) {
        console.error("Share check error:", shareError);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
      }

      if (!shareRow) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ crossword: data });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = rateLimit(req, { key: "crosswords-delete", max: 40, windowMs: 60_000 });
    if (rl) return rl;

    const auth = await requireApiUser(req);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const crosswordId = id;

    if (!uuidSchema.safeParse(crosswordId).success) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Delete the crossword (clues will cascade delete via foreign key)
    const { data, error } = await supabaseAdmin
      .from("crosswords")
      .delete()
      .eq("id", crosswordId)
      .eq("user_id", auth.user.id)
      .select("id");

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
