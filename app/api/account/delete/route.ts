import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const rl = rateLimit(req, { key: "account-delete", max: 5, windowMs: 60 * 60_000 });
    if (rl) return rl;

    const auth = await requireApiUser(req);
    if ("error" in auth) return auth.error;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const id = auth.user.id;

    const { data: ownedCrosswords, error: ownedCrosswordsError } = await supabaseAdmin
      .from("crosswords")
      .select("id")
      .eq("user_id", id);

    if (ownedCrosswordsError) {
      return NextResponse.json({ error: ownedCrosswordsError.message }, { status: 500 });
    }

    const ownedCrosswordIds = (ownedCrosswords || []).map((row: any) => row.id);

    if (ownedCrosswordIds.length > 0) {
      const { error: shareByOwnedError } = await supabaseAdmin
        .from("crossword_shares")
        .delete()
        .in("crossword_id", ownedCrosswordIds);
      if (shareByOwnedError) {
        return NextResponse.json({ error: shareByOwnedError.message }, { status: 500 });
      }

      const { error: cluesError } = await supabaseAdmin
        .from("crossword_clues")
        .delete()
        .in("crossword_id", ownedCrosswordIds);
      if (cluesError) {
        return NextResponse.json({ error: cluesError.message }, { status: 500 });
      }
    }

    const { error: shareForUserError } = await supabaseAdmin
      .from("crossword_shares")
      .delete()
      .eq("shared_with_user_id", id);
    if (shareForUserError) {
      return NextResponse.json({ error: shareForUserError.message }, { status: 500 });
    }

    const { error: crosswordsError } = await supabaseAdmin
      .from("crosswords")
      .delete()
      .eq("user_id", id);
    if (crosswordsError) {
      return NextResponse.json({ error: crosswordsError.message }, { status: 500 });
    }

    const { error: friendReqSentError } = await supabaseAdmin
      .from("friend_requests")
      .delete()
      .eq("from_user_id", id);
    if (friendReqSentError) {
      return NextResponse.json({ error: friendReqSentError.message }, { status: 500 });
    }

    const { error: friendReqReceivedError } = await supabaseAdmin
      .from("friend_requests")
      .delete()
      .eq("to_user_id", id);
    if (friendReqReceivedError) {
      return NextResponse.json({ error: friendReqReceivedError.message }, { status: 500 });
    }

    const { error: friendshipsUserError } = await supabaseAdmin
      .from("friendships")
      .delete()
      .eq("user_id", id);
    if (friendshipsUserError) {
      return NextResponse.json({ error: friendshipsUserError.message }, { status: 500 });
    }

    const { error: friendshipsFriendError } = await supabaseAdmin
      .from("friendships")
      .delete()
      .eq("friend_id", id);
    if (friendshipsFriendError) {
      return NextResponse.json({ error: friendshipsFriendError.message }, { status: 500 });
    }

    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .delete()
      .eq("id", id);
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Finally delete the auth user
    try {
      // @ts-ignore - admin API
      const { error: authError } = await (supabaseAdmin.auth as any).admin.deleteUser(id);
      if (authError) {
        console.error("Failed deleting auth user:", authError);
        return NextResponse.json({ error: authError.message || "Failed to delete auth user" }, { status: 500 });
      }
    } catch (e) {
      console.error("Auth delete error:", e);
      return NextResponse.json({ error: "Failed to delete auth user" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Account delete route error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
