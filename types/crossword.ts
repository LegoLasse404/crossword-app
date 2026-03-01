export interface Crossword {
  id: string;
  user_id: string;
  title?: string;
  layout?: any;
  created_at: string;
  updated_at: string;
}

export interface CrosswordClue {
  id: string;
  crossword_id: string;
  hint: string;
  word: string;
  created_at: string;
}
