import { supabase } from "./supabase";
import { Crossword, CrosswordClue } from "@/types/crossword";

export async function createCrossword(
  userId: string,
  hints: Array<{ hint: string; word: string }>,
  layout: any,
  title?: string,
  client = supabase // allow passing custom client (e.g. service role)
) {
  // Insert crossword including generated layout JSON
  const { data: crossword, error: crosswordError } = await client
    .from("crosswords")
    .insert({
      user_id: userId,
      title: title || null,
      layout: layout || null,
    })
    .select()
    .single();

  if (crosswordError) throw crosswordError;

  // Insert clues
  const clues = hints.map((hint) => ({
    crossword_id: crossword.id,
    hint: hint.hint,
    word: hint.word,
  }));

  const { error: cluesError } = await client
    .from("crossword_clues")
    .insert(clues);

  if (cluesError) throw cluesError;

  return crossword;
}

export async function getCrossword(crosswordId: string) {
  const { data, error } = await supabase
    .from("crosswords")
    .select(
      `
      *,
      crossword_clues(*)
    `
    )
    .eq("id", crosswordId)
    .single();

  if (error) throw error;
  return data as Crossword & { crossword_clues: CrosswordClue[] };
}

export async function getUserCrosswords(userId: string) {
  const { data, error } = await supabase
    .from("crosswords")
    .select(
      `
      *,
      crossword_clues(*)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteCrossword(crosswordId: string) {
  const { error } = await supabase
    .from("crosswords")
    .delete()
    .eq("id", crosswordId);

  if (error) throw error;
}
