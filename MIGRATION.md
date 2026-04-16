# Database Migration: Fix Vote Integrity

## Problem
The `votes` table currently uses a random `user_token` from localStorage, which:
- Has no relationship to authenticated users
- Can be easily spoofed or duplicated
- Has no unique constraint to prevent duplicate votes

## Migration SQL (run in Supabase SQL Editor)

```sql
-- Step 1: Add user_id column (references auth.users)
ALTER TABLE votes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Step 2: Add unique constraint to prevent duplicate votes per user per paper
ALTER TABLE votes ADD CONSTRAINT votes_user_paper_unique UNIQUE (paper_id, user_id);

-- Step 3 (optional): Remove the old user_token column after migration
-- ALTER TABLE votes DROP COLUMN IF EXISTS user_token;

-- Step 4: Add RLS policy so users can only insert their own votes
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own votes" ON votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read votes" ON votes
  FOR SELECT USING (true);

-- Prevent updates and deletes (one vote, permanent)
CREATE POLICY "No vote updates" ON votes
  FOR UPDATE USING (false);

CREATE POLICY "No vote deletes" ON votes
  FOR DELETE USING (false);
```

## Notes
- Run Step 1-2 before deploying the new code
- The frontend now sends `user.id` (from Supabase Auth) instead of a random token
- The unique constraint ensures one vote per user per paper at the database level
- RLS policies add server-side enforcement
