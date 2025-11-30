/*
  # Add CEO Admin Policies for User Management

  ## Problem
  CEO cannot update other users' roles or verification status because RLS policies only allow
  users to update their own profiles.

  ## Solution
  1. Create a function to check if current user is CEO
  2. Add policies allowing CEO to view and update all users
  
  ## Changes
  - Add helper function to check CEO role
  - Add SELECT policy for CEO to view all users
  - Add UPDATE policy for CEO to update all users
  
  ## Security
  - Uses a self-contained function that doesn't cause recursion
  - Only CEO role can manage other users
*/

-- Create a function to check if user is CEO
-- This uses a direct query to avoid RLS recursion
CREATE OR REPLACE FUNCTION is_ceo()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'ceo'
  );
$$;

-- Allow CEO to view all users
CREATE POLICY "CEO can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (is_ceo());

-- Allow CEO to update all users
CREATE POLICY "CEO can update all users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (is_ceo())
  WITH CHECK (is_ceo());