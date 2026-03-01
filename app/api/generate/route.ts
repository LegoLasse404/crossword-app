import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { generateBodySchema } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/rate-limit";
import { createCrossword } from "@/lib/db";
// Use require because some older generator libs don't support ESM imports perfectly
const clg = require("crossword-layout-generator");

export async function POST(req: Request) {
  try {
    const rl = rateLimit(req, { key: "generate", max: 20, windowMs: 60_000 });
    if (rl) return rl;

    const auth = await requireApiUser(req);
    if ("error" in auth) return auth.error;

    const parsed = generateBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { words, title } = parsed.data;

    const sanitizedWords = words
      .map((word: any) => ({
        answer: String(word?.answer || "").trim().toUpperCase(),
        clue: String(word?.clue || "").trim(),
      }))
      .filter((word: any) => word.answer.length > 0 && word.clue.length > 0)
      .slice(0, 100);

    if (sanitizedWords.length === 0) {
      return NextResponse.json({ error: "No valid words provided" }, { status: 400 });
    }

    const layout = clg.generateLayout(sanitizedWords);
    if (!layout) {
      return NextResponse.json({ error: "Could not generate layout" }, { status: 400 });
    }

    // store crossword with layout and clues
    try {
      // use admin client so RLS policies don't block us
      if (!supabaseAdmin) {
        throw new Error("supabaseAdmin client not configured");
      }
      const crossword = await createCrossword(
        auth.user.id,
        sanitizedWords.map((w: any) => ({ hint: w.clue, word: w.answer })),
        layout,
        title,
        supabaseAdmin
      );
      return NextResponse.json({ layout, crossword });
    } catch (dbErr) {
      console.error("DB insert error", dbErr);
      return NextResponse.json(
        { error: (dbErr as Error)?.message || "DB error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}