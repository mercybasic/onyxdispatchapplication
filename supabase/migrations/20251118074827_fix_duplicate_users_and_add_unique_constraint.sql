/*
  # Fix Duplicate Users and Add Unique Constraint

  1. Changes
    - Remove duplicate users (keep the one with actual Discord ID format)
    - Add unique constraint on discord_id to prevent future duplicates
    - Preserve user data for authenticated users

  2. Logic
    - For each duplicate username, keep only the user with a numeric Discord ID
    - Delete users with UUID-format discord_ids if a real Discord ID exists
    - Add unique constraint on discord_id column
*/

-- First, let's identify and handle duplicates
-- Keep users with numeric discord_ids (real Discord IDs) over UUID discord_ids (auth IDs)
DO $$
DECLARE
  duplicate_username TEXT;
  keep_user_id UUID;
  delete_user_ids UUID[];
BEGIN
  -- Find all duplicate usernames
  FOR duplicate_username IN 
    SELECT discord_username 
    FROM users 
    GROUP BY discord_username 
    HAVING COUNT(*) > 1
  LOOP
    -- For each duplicate, keep the one with a numeric discord_id (real Discord ID)
    -- Real Discord IDs are numeric strings, UUIDs contain hyphens
    SELECT id INTO keep_user_id
    FROM users
    WHERE discord_username = duplicate_username
      AND discord_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    LIMIT 1;

    -- If no numeric discord_id found, keep the first one
    IF keep_user_id IS NULL THEN
      SELECT id INTO keep_user_id
      FROM users
      WHERE discord_username = duplicate_username
      ORDER BY created_at
      LIMIT 1;
    END IF;

    -- Delete all other duplicates for this username
    DELETE FROM users
    WHERE discord_username = duplicate_username
      AND id != keep_user_id;

    RAISE NOTICE 'Cleaned up duplicates for username: %', duplicate_username;
  END LOOP;
END $$;

-- Add unique constraint on discord_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_discord_id_unique'
  ) THEN
    -- First check for any remaining discord_id duplicates
    IF EXISTS (
      SELECT discord_id 
      FROM users 
      GROUP BY discord_id 
      HAVING COUNT(*) > 1
    ) THEN
      -- If duplicates exist, keep the most recently created one
      DELETE FROM users a
      USING users b
      WHERE a.discord_id = b.discord_id
        AND a.created_at < b.created_at;
    END IF;

    -- Now add the unique constraint
    ALTER TABLE users ADD CONSTRAINT users_discord_id_unique UNIQUE (discord_id);
    RAISE NOTICE 'Added unique constraint on discord_id';
  END IF;
END $$;
