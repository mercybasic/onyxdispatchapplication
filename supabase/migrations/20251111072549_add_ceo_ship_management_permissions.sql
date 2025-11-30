/*
  # Add CEO Ship Management Permissions

  ## Overview
  Allow CEO to create and manage all ships and crews alongside admins and dispatchers.

  ## Changes
  1. Update ship creation policies to include CEO
  2. Update crew management policies to include CEO
  3. Ensure CEO has full access to ship/crew operations

  ## Security
  - CEO role check is done via EXISTS query on users table
  - Maintains existing admin/dispatcher permissions
*/

-- Add CEO to ship creation policy
CREATE POLICY "CEO can create ships"
  ON ships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
      AND users.verified = true
    )
  );

-- Add CEO to crew management insert
CREATE POLICY "CEO can add crew members"
  ON crew_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
      AND users.verified = true
    )
  );

-- Add CEO to crew management update
CREATE POLICY "CEO can update crew members"
  ON crew_members
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

-- Add CEO to crew management delete
CREATE POLICY "CEO can remove crew members"
  ON crew_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
      AND users.verified = true
    )
  );