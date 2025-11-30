/*
  # Fix Infinite Recursion in Users Table RLS Policies

  ## Problem
  The RLS policies for the users table were checking the users table itself to determine permissions,
  creating an infinite recursion loop.

  ## Solution
  1. Drop the problematic policies that cause recursion
  2. Recreate simpler policies that don't reference the users table in a circular way
  3. Allow users to insert their own profile (for initial Discord login)
  
  ## Changes
  - Drop: "Admin and above can view all users"
  - Drop: "CEO has full access to users"
  - Keep: "Users can read own profile" (no recursion)
  - Keep: "Users can update own profile" (no recursion)
  - Keep: "Users can view all active users" (no recursion)
  - Add: Policy to allow authenticated users to insert their own profile
*/

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admin and above can view all users" ON users;
DROP POLICY IF EXISTS "CEO has full access to users" ON users;

-- Allow users to insert their own profile (needed for Discord auth)
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Note: Admin/CEO access should be handled at the application level with service role key
-- or through a separate admin interface that bypasses RLS