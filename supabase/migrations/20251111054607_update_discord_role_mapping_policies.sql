/*
  # Update Discord Role Mapping Policies for Admin Access

  1. Changes
    - Update RLS policies to allow both 'dispatcher' and 'admin' roles to manage Discord role mappings
    - Admins should have full access to configure role mappings

  2. Security
    - Maintains restriction that only dispatchers and admins can manage role mappings
    - All authenticated users can still view mappings
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Dispatchers can manage role mappings" ON discord_role_mappings;

-- Create new policy that includes admin role
CREATE POLICY "Dispatchers and admins can manage role mappings"
  ON discord_role_mappings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('dispatcher', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('dispatcher', 'admin')
    )
  );