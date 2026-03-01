import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { shareCrosswordBodySchema } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const rl = rateLimit(req, { key: "crosswords-shares-list", max: 120, windowMs: 60_000 });
    if (rl) return rl;

    const auth = await requireApiUser(req);
    if ("error" in auth) return auth.error;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("crossword_shares")
      .select("*, crosswords(*)")
      .eq("shared_with_user_id", auth.user.id);

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const crosswords = (data || []).map((row: any) => row.crosswords);
    return NextResponse.json({ crosswords });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const rl = rateLimit(req, { key: "crosswords-shares-create", max: 40, windowMs: 60_000 });
    if (rl) return rl;

    const auth = await requireApiUser(req);
    if ("error" in auth) return auth.error;

    const parsed = shareCrosswordBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { crossword_id, shared_with_user_id } = parsed.data;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    if (shared_with_user_id === auth.user.id) {
      return NextResponse.json(
        { error: "Cannot share with yourself" },
        { status: 400 }
      );
    }

    const { data: ownedCrossword, error: ownerError } = await supabaseAdmin
      .from("crosswords")
      .select("id")
      .eq("id", crossword_id)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (ownerError) {
      console.error("Ownership check error:", ownerError);
      return NextResponse.json({ error: ownerError.message }, { status: 500 });
    }

    if (!ownedCrossword) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: existingShare } = await supabaseAdmin
      .from("crossword_shares")
      .select("id")
      .eq("crossword_id", crossword_id)
      .eq("shared_with_user_id", shared_with_user_id)
      .maybeSingle();

    if (existingShare) {
      return NextResponse.json({ success: true });
    }

    const { error } = await supabaseAdmin
      .from("crossword_shares")
      .insert([{ crossword_id, shared_with_user_id }] as any);

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
