import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { createFriendRequestBodySchema } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/rate-limit";
import { maskEmail } from "@/lib/security";

export async function GET(req: Request) {
  try {
    const rl = rateLimit(req, { key: "friend-requests-list", max: 120, windowMs: 60_000 });
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
      .from("friend_requests")
      .select("*")
      .eq("to_user_id", auth.user.id)
      .eq("status", "pending");

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const fromUserIds = data?.map((r: any) => r.from_user_id) || [];
    let userProfiles: { [key: string]: any } = {};

    if (fromUserIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("user_profiles")
        .select("id, email, username")
        .in("id", fromUserIds);

      if (profiles) {
        userProfiles = profiles.reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    const requests =
      data?.map((r: any) => ({
        id: r.id,
        from_user_id: r.from_user_id,
        to_user_id: r.to_user_id,
        status: r.status,
        created_at: r.created_at,
        from_user: userProfiles[r.from_user_id]
          ? {
              ...userProfiles[r.from_user_id],
              email: maskEmail(userProfiles[r.from_user_id].email),
            }
          : null,
      })) || [];

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const rl = rateLimit(req, { key: "friend-requests-create", max: 20, windowMs: 600_000 });
    if (rl) return rl;

    const auth = await requireApiUser(req);
    if ("error" in auth) return auth.error;

    const parsed = createFriendRequestBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { to_user_id } = parsed.data;

    if (to_user_id === auth.user.id) {
      return NextResponse.json(
        { error: "Cannot send request to yourself" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("friendships")
      .select("id")
      .or(
        `and(user_id.eq.${auth.user.id},friend_id.eq.${to_user_id}),and(user_id.eq.${to_user_id},friend_id.eq.${auth.user.id})`
      )
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Already friends" }, { status: 400 });
    }

    const { data: existingRequest } = await supabaseAdmin
      .from("friend_requests")
      .select("id")
      .eq("from_user_id", auth.user.id)
      .eq("to_user_id", to_user_id)
      .eq("status", "pending")
      .limit(1);

    if (existingRequest && existingRequest.length > 0) {
      return NextResponse.json(
        { error: "Request already sent" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("friend_requests").insert({
      from_user_id: auth.user.id,
      to_user_id,
      status: "pending",
    });

    if (error) {
      console.error("Insert error:", error);
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
