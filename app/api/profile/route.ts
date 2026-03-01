import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { profileBodySchema } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const rl = rateLimit(req, { key: "profile-update", max: 30, windowMs: 60_000 });
    if (rl) return rl;

    const auth = await requireApiUser(req);
    if ("error" in auth) return auth.error;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server not configured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const parsed = profileBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { username } = parsed.data;

    // Ensure required non-null columns are provided. If `email` is required
    // by the `user_profiles` table, fetch the user's email from the auth
    // system (via the admin client) and include it in the upsert payload.
    const payload: any = { id: auth.user.id, username };

    try {
      const userRes = await supabaseAdmin.auth.admin.getUserById(auth.user.id);
      const userRecord = (userRes as any)?.data?.user ?? (userRes as any)?.data;
      const userError = (userRes as any)?.error;
      if (!userError && userRecord?.email) {
        payload.email = userRecord.email;
      }
    } catch (e) {
      // ignore — we'll attempt the upsert and let DB errors surface
    }

    const { data, error } = await supabaseAdmin.from("user_profiles").upsert(payload).select().single();

    if (error) {
      console.error("Profile upsert error:", error);
      return NextResponse.json({ error: error.message || "Upsert failed" }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch (err) {
    console.error("Profile route error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
