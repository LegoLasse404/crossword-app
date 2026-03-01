import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { uuidSchema } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/rate-limit";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = rateLimit(req, { key: "friends-delete", max: 40, windowMs: 60_000 });
    if (rl) return rl;

    const auth = await requireApiUser(req);
    if ("error" in auth) return auth.error;

    const { id } = await params;

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("friendships")
      .delete()
      .eq("id", id)
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
