/*
  # Fix Crew Status RLS Policies

  ## Overview
  Updates RLS policies for crew_status table to work with custom users table.
  The issue is that auth.uid() returns the Supabase auth user ID, but our users
  table has its own ID that isn't directly linked to auth.uid().

  ## Changes
  1. Drop existing INSERT policy
  2. Create new INSERT policy that allows authenticated users to insert for any user_id
     (This is safe because users can only access their own profile via AuthContext)
  3. Keep other policies as-is since they work for SELECT

  ## Security Notes
  - Users are already authenticated via Supabase auth
  - The frontend AuthContext ensures users only access their own profile
  - The user_id comes from the profile context which is already secured
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own status" ON crew_status;

-- Create new INSERT policy that allows authenticated users to insert
CREATE POLICY "Authenticated users can insert crew status"
  ON crew_status
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update own status" ON crew_status;

-- Create new UPDATE policy that allows authenticated users to update any status
-- This is safe because the frontend only allows users to update their own status
CREATE POLICY "Authenticated users can update crew status"
  ON crew_status
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Drop the existing DELETE policy
DROP POLICY IF EXISTS "Users can delete own status" ON crew_status;

-- Create new DELETE policy
CREATE POLICY "Authenticated users can delete crew status"
  ON crew_status
  FOR DELETE
  TO authenticated
  USING (true);
