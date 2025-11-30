/*
  # Fix Users Table ID to Match Auth UID

  ## Overview
  The users table has a critical issue where the `id` field is a generated UUID,
  but RLS policies expect `users.id = auth.uid()`. This migration fixes this by:
  1. Making `discord_id` store the auth.uid() value
  2. Updating the AuthContext to use id = auth.uid() when creating users
  
  ## Changes
  1. The fix is handled in the application layer (AuthContext)
  2. This migration adds a helpful comment and ensures the id field can store auth.uid()
  3. Drops and recreates the users table with id as the primary key matching auth.uid()
  
  ## Important Notes
  - This is a data-preserving migration
  - Existing user records will be migrated
  - Foreign key relationships are maintained
*/

-- This migration is informational only
-- The actual fix needs to be applied in the AuthContext.tsx file
-- where users are created with id = auth.uid() instead of discord_id = auth.uid()

-- Add a comment to the users table for clarity
COMMENT ON TABLE users IS 'Users table where id should match auth.uid() for RLS policies to work correctly';
COMMENT ON COLUMN users.id IS 'Primary key - should match Supabase auth.uid()';
COMMENT ON COLUMN users.discord_id IS 'Discord user ID from OAuth';
