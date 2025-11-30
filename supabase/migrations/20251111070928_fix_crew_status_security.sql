/*
  # Fix Crew Status Security Policies

  ## Problem
  Current policies allow any authenticated user to modify anyone's crew status using USING (true).

  ## Solution
  1. Drop overly permissive policies
  2. Create restrictive policies that only allow users to manage their own status
  3. Allow dispatchers/admins/CEO to view all statuses
  
  ## Changes
  - Users can only insert/update/delete their own crew status
  - All authenticated users can view all crew statuses (needed for dispatch)
*/

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert crew status" ON crew_status;
DROP POLICY IF EXISTS "Authenticated users can update crew status" ON crew_status;
DROP POLICY IF EXISTS "Authenticated users can delete crew status" ON crew_status;

-- Allow users to insert their own crew status
CREATE POLICY "Users can insert own crew status"
  ON crew_status
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own crew status
CREATE POLICY "Users can update own crew status"
  ON crew_status
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own crew status
CREATE POLICY "Users can delete own crew status"
  ON crew_status
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);