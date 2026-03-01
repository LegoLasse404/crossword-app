# Supabase Database Setup

To set up your Supabase database, follow these steps:

## 1. Create a Supabase Project
- Go to https://supabase.com and create a new project
- Note your URL and anon public key
- Add them to `.env.local`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
  ```

## 2. Create Tables in Supabase SQL Editor

Run the following SQL in your Supabase SQL editor:

```sql
-- Create users table (Supabase auth_users exists, but you may want a public profile table)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create crosswords table
CREATE TABLE IF NOT EXISTS crosswords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  layout JSONB, -- generated layout stored as JSON
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- If the project already has a crosswords table without a layout column, run:
-- ALTER TABLE crosswords ADD COLUMN IF NOT EXISTS layout JSONB;

-- Create crossword clues table
CREATE TABLE IF NOT EXISTS crossword_clues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crossword_id UUID NOT NULL REFERENCES crosswords(id) ON DELETE CASCADE,
  hint TEXT NOT NULL,
  word TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_crosswords_user_id ON crosswords(user_id);
CREATE INDEX idx_crossword_clues_crossword_id ON crossword_clues(crossword_id);
```

## 3. Enable Row Level Security (Optional but Recommended)

Enable RLS on the tables to ensure users can only access their own data:

```sql
ALTER TABLE crosswords ENABLE ROW LEVEL SECURITY;
ALTER TABLE crossword_clues ENABLE ROW LEVEL SECURITY;

-- Policy for crosswords
CREATE POLICY "Users can access their own crosswords"
  ON crosswords
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy for clues (via crossword)
CREATE POLICY "Users can access clues of their crosswords"
  ON crossword_clues
  FOR ALL
  USING (
    crossword_id IN (
      SELECT id FROM crosswords WHERE user_id = auth.uid()
    )
  );
```

## 4. Using the Database Functions

The app provides helper functions in `lib/db.ts`:
- `createCrossword(userId, hints, title)` - Create a new crossword
- `getCrossword(crosswordId)` - Get a single crossword with its clues
- `getUserCrosswords(userId)` - Get all crosswords for a user
- `deleteCrossword(crosswordId)` - Delete a crossword
