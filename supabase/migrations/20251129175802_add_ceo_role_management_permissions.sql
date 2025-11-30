/*
  # Add CEO Role Management Permissions

  ## Overview
  This migration adds RLS policies to allow CEO users to update any user's role
  while maintaining that regular users can only update their own profile information
  (excluding role changes).

  ## Changes
  1. Add policy for CEO to update any user's role
  2. Modify existing user update policies to prevent regular users from changing their own role
  3. Ensure role changes are only possible via Discord verification or CEO override

  ## Security
  - CEO role check is done via EXISTS query on users table
  - Regular users cannot change their own role
  - Regular users can still update their own profile information (picture, etc.)
  
  ## Important Notes
  - Roles should primarily be assigned via Discord verification
  - CEO can manually override roles when needed
  - This enables emergency role management by CEO
*/

-- Drop existing update policies to recreate them with proper role restrictions
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile info" ON users;

-- Policy: Users can update their own profile (excluding role and verified fields)
CREATE POLICY "Users can update own profile excluding role"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() 
    AND role = (SELECT role FROM users WHERE id = auth.uid())
    AND verified = (SELECT verified FROM users WHERE id = auth.uid())
  );

-- Policy: CEO can update any user's role and verification status
CREATE POLICY "CEO can manage all user roles"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
      AND users.verified = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
      AND users.verified = true
    )
  );

-- Add comment for clarity
COMMENT ON TABLE users IS 'Users table: Roles assigned via Discord verification or CEO override';
