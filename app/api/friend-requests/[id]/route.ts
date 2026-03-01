import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { updateFriendRequestBodySchema, uuidSchema } from "@/lib/api-schemas";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = rateLimit(req, { key: "friend-requests-update", max: 60, windowMs: 60_000 });
    if (rl) return rl;

    const auth = await requireApiUser(req);
    if ("error" in auth) return auth.error;

    const { id } = await params;

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const parsed = updateFriendRequestBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { status } = parsed.data;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("friend_requests")
      .select("id, from_user_id, to_user_id")
      .eq("id", id)
      .maybeSingle();

    if (requestError) {
      console.error("Request lookup error:", requestError);
      return NextResponse.json({ error: requestError.message }, { status: 500 });
    }

    if (!requestRow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (requestRow.to_user_id !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (status === "accepted") {
      const from_user_id = requestRow.from_user_id;
      const to_user_id = requestRow.to_user_id;

      const { error: insertError } = await supabaseAdmin
        .from("friendships")
        .insert([
          {
            user_id: from_user_id,
            friend_id: to_user_id,
            status: "accepted",
          },
          {
            user_id: to_user_id,
            friend_id: from_user_id,
            status: "accepted",
          },
        ]);

      if (insertError) {
        console.error("Insert error:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const { error } = await supabaseAdmin
      .from("friend_requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = rateLimit(req, { key: "friend-requests-delete", max: 60, windowMs: 60_000 });
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

    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("friend_requests")
      .select("id, from_user_id, to_user_id")
      .eq("id", id)
      .maybeSingle();

    if (requestError) {
      console.error("Request lookup error:", requestError);
      return NextResponse.json({ error: requestError.message }, { status: 500 });
    }

    if (!requestRow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (
      requestRow.from_user_id !== auth.user.id &&
      requestRow.to_user_id !== auth.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("friend_requests")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
