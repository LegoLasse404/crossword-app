import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { searchQuerySchema } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/rate-limit";
import { maskEmail, normalizeSearchTerm } from "@/lib/security";

export async function GET(req: Request) {
  try {
    const rl = rateLimit(req, { key: "users-search", max: 60, windowMs: 60_000 });
    if (rl) return rl;

    const auth = await requireApiUser(req);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const parsed = searchQuerySchema.safeParse({ q: searchParams.get("q") ?? "" });
    if (!parsed.success) {
      return NextResponse.json({ users: [] });
    }

    const safeQuery = normalizeSearchTerm(parsed.data.q);
    if (safeQuery.length < 2) return NextResponse.json({ users: [] });

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const pattern = `%${safeQuery}%`;

    const [{ data: usernameMatches, error: usernameError }, { data: emailMatches, error: emailError }] =
      await Promise.all([
        supabaseAdmin
          .from("user_profiles")
          .select("id, email, username")
          .ilike("username", pattern)
          .neq("id", auth.user.id)
          .limit(10),
        supabaseAdmin
          .from("user_profiles")
          .select("id, email, username")
          .ilike("email", pattern)
          .neq("id", auth.user.id)
          .limit(10),
      ]);

    if (usernameError || emailError) {
      const err = usernameError || emailError;
      console.error("Search error:", err);
      return NextResponse.json({ error: err?.message || "Search failed" }, { status: 500 });
    }

    const merged = [...(usernameMatches || []), ...(emailMatches || [])];
    const uniqueUsers = Array.from(
      new Map(merged.map((user: any) => [user.id, user])).values()
    )
      .slice(0, 10)
      .map((user: any) => ({
        ...user,
        email: maskEmail(user.email),
      }));

    return NextResponse.json({ users: uniqueUsers });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
