/*
  # Add CEO Role to Ship Management Policies

  1. Policy Updates
    - Update "Administrators can create ships" policy to include 'ceo' role
    - Update "Administrators can update their own ships" policy to include 'ceo' role
    - Update "Administrators can delete their own ships" policy to include 'ceo' role
    - Update crew management policies to include 'ceo' role
    
  2. Important Notes
    - CEO role should have full access to all ship management functions
    - CEO role requires verification (verified = true) like other admin roles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Administrators can create ships" ON ships;
DROP POLICY IF EXISTS "Administrators can update their own ships" ON ships;
DROP POLICY IF EXISTS "Administrators can delete their own ships" ON ships;
DROP POLICY IF EXISTS "Ship administrators can manage crew" ON crew_members;
DROP POLICY IF EXISTS "Ship administrators can update crew" ON crew_members;
DROP POLICY IF EXISTS "Ship administrators can remove crew" ON crew_members;

-- Recreate ships policies with CEO role included
CREATE POLICY "Administrators can create ships"
  ON ships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('administrator', 'dispatcher', 'ceo')
      AND users.verified = true
    )
  );

CREATE POLICY "Administrators can update their own ships"
  ON ships
  FOR UPDATE
  TO authenticated
  USING (
    administrator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('dispatcher', 'ceo')
      AND users.verified = true
    )
  )
  WITH CHECK (
    administrator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('dispatcher', 'ceo')
      AND users.verified = true
    )
  );

CREATE POLICY "Administrators can delete their own ships"
  ON ships
  FOR DELETE
  TO authenticated
  USING (
    administrator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('dispatcher', 'ceo')
      AND users.verified = true
    )
  );

-- Recreate crew management policies with CEO role included
CREATE POLICY "Ship administrators can manage crew"
  ON crew_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ships
      WHERE ships.id = ship_id
      AND ships.administrator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('dispatcher', 'ceo')
      AND users.verified = true
    )
  );

CREATE POLICY "Ship administrators can update crew"
  ON crew_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ships
      WHERE ships.id = ship_id
      AND ships.administrator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('dispatcher', 'ceo')
      AND users.verified = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ships
      WHERE ships.id = ship_id
      AND ships.administrator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('dispatcher', 'ceo')
      AND users.verified = true
    )
  );

CREATE POLICY "Ship administrators can remove crew"
  ON crew_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ships
      WHERE ships.id = ship_id
      AND ships.administrator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('dispatcher', 'ceo')
      AND users.verified = true
    )
  );
