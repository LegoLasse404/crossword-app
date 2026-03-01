import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { previewBodySchema } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/rate-limit";
const clg = require("crossword-layout-generator");

export async function POST(req: Request) {
  try {
    const rl = rateLimit(req, { key: "crosswords-preview", max: 60, windowMs: 60_000 });
    if (rl) return rl;

    const auth = await requireApiUser(req);
    if ("error" in auth) return auth.error;

    const parsed = previewBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { words } = parsed.data;

    const sanitizedWords = words
      .map((word: any) => ({
        answer: String(word?.answer || "").trim().toUpperCase(),
        clue: String(word?.clue || "").trim(),
      }))
      .filter((word: any) => word.answer.length > 0 && word.clue.length > 0);

    if (sanitizedWords.length === 0) {
      return NextResponse.json({ layout: null });
    }

    const layout = clg.generateLayout(sanitizedWords);
    if (!layout) {
      return NextResponse.json({ error: "Could not generate layout" }, { status: 400 });
    }

    return NextResponse.json({ layout });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
