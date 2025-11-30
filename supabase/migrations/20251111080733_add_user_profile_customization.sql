/*
  # Add User Profile Customization

  ## Overview
  Allow all users to customize their profile with a custom username and profile picture.

  ## Changes
  1. New Columns
    - Add `profile_picture_url` (text) to users table for storing profile image URL
    - Keep existing `discord_username` field for display name/username

  2. Security
    - Update RLS policies to allow users to update their own username and profile picture
    - Users can only update their own profile information
    - All users (regardless of role) can update these fields

  ## Notes
  - Profile pictures will be stored using URLs (can be uploaded to Supabase Storage)
  - Username remains unique constraint-free to allow duplicates
*/

-- Add profile picture URL column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_picture_url text;
  END IF;
END $$;

-- Create policy for users to update their own profile information
DROP POLICY IF EXISTS "Users can update own profile info" ON users;
CREATE POLICY "Users can update own profile info"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());