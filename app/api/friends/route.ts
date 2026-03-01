import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { maskEmail } from "@/lib/security";

export async function GET(req: Request) {
  try {
    const rl = rateLimit(req, { key: "friends-list", max: 120, windowMs: 60_000 });
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
      .from("friendships")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("status", "accepted");

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch friends" },
        { status: 500 }
      );
    }

    // Fetch user profiles for the friend_ids
    const friendIds = data?.map((f: any) => f.friend_id) || [];
    let userProfiles: { [key: string]: any } = {};
    
    if (friendIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("user_profiles")
        .select("id, email, username")
        .in("id", friendIds);
      
      if (profiles) {
        userProfiles = profiles.reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    // Map the response to include friend data
    const friends = data?.map((f: any) => {
      const profile = userProfiles[f.friend_id] || {};
      return {
        friendship_id: f.id, // The friendship record ID for deletion
        id: f.friend_id, // The friend's user ID
        email: maskEmail(profile.email || ''),
        username: profile.username || null,
      };
    }) || [];

    return NextResponse.json({ friends });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
