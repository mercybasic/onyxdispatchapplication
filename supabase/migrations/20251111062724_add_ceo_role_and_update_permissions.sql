/*
  # Add CEO Role and Update Permission Hierarchy

  ## Overview
  This migration adds a CEO role as the highest permission level and updates the role hierarchy:
  CEO > Admin > Dispatcher > Staff

  ## Changes

  ### 1. Role Hierarchy Updates
  - Add 'ceo' role as the highest permission level
  - Update role hierarchy: CEO → Admin → Dispatcher → Staff
  - Rename 'crew' to 'staff' for consistency
  - CEO: Full system access, only role with access to role management and discord role mapping
  - Admin: Can manage dispatch dashboard and their own ships/crews
  - Dispatcher: Can manage dispatch dashboard and their own ships/crews
  - Staff: Can only view requests assigned to their crew

  ### 2. Permission Changes
  - Restrict `users` table update policies to CEO only (for role changes)
  - Restrict `discord_role_mappings` table access to CEO only
  - Allow Admin and Dispatcher access to dispatch dashboard
  - Add crew-based filtering for Staff role

  ### 3. Security Updates
  - Update RLS policies to reflect new permission hierarchy
  - Ensure Staff can only access data for their assigned crews
*/

-- First, rename existing 'crew' roles to 'staff'
UPDATE users SET role = 'staff' WHERE role = 'crew';

-- Drop the old constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_check'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;
END $$;

-- Add new constraint with updated roles
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('ceo', 'admin', 'dispatcher', 'staff', 'administrator'));

-- Drop all existing user policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Staff and above can view all users" ON users;
DROP POLICY IF EXISTS "Staff and above can update user roles and verification" ON users;
DROP POLICY IF EXISTS "Admin and above can view all users" ON users;
DROP POLICY IF EXISTS "CEO has full access to users" ON users;

-- CEO has full access
CREATE POLICY "CEO has full access to users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
    )
  );

-- Everyone can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admin, Dispatcher, and Staff can view other users (for crew assignment, etc.)
CREATE POLICY "Admin and above can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'dispatcher', 'staff', 'administrator')
    )
  );

-- Update discord_role_mappings policies to restrict to CEO only
DROP POLICY IF EXISTS "Admin and dispatcher can view role mappings" ON discord_role_mappings;
DROP POLICY IF EXISTS "Admin and dispatcher can insert role mappings" ON discord_role_mappings;
DROP POLICY IF EXISTS "Admin and dispatcher can update role mappings" ON discord_role_mappings;
DROP POLICY IF EXISTS "Admin and dispatcher can delete role mappings" ON discord_role_mappings;
DROP POLICY IF EXISTS "CEO can view role mappings" ON discord_role_mappings;
DROP POLICY IF EXISTS "CEO can insert role mappings" ON discord_role_mappings;
DROP POLICY IF EXISTS "CEO can update role mappings" ON discord_role_mappings;
DROP POLICY IF EXISTS "CEO can delete role mappings" ON discord_role_mappings;

CREATE POLICY "CEO can view role mappings"
  ON discord_role_mappings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
    )
  );

CREATE POLICY "CEO can insert role mappings"
  ON discord_role_mappings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
    )
  );

CREATE POLICY "CEO can update role mappings"
  ON discord_role_mappings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
    )
  );

CREATE POLICY "CEO can delete role mappings"
  ON discord_role_mappings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
    )
  );

-- Update service_requests policies
DROP POLICY IF EXISTS "Staff and above can view service requests" ON service_requests;
DROP POLICY IF EXISTS "Dispatcher can update service requests" ON service_requests;
DROP POLICY IF EXISTS "Staff can view requests assigned to their crew" ON service_requests;
DROP POLICY IF EXISTS "Admin and above can view all service requests" ON service_requests;
DROP POLICY IF EXISTS "Admin and above can update service requests" ON service_requests;

-- Staff can view requests assigned to their crew
CREATE POLICY "Staff can view requests assigned to their crew"
  ON service_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN crew_members cm ON cm.user_id = u.id
      WHERE u.id = auth.uid()
      AND u.role = 'staff'
      AND cm.ship_id IN (
        SELECT ship_id FROM crew_members WHERE user_id = auth.uid()
      )
    )
  );

-- Admin, Dispatcher, and CEO can view all requests
CREATE POLICY "Admin and above can view all service requests"
  ON service_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ceo', 'admin', 'dispatcher', 'administrator')
    )
  );

-- Admin, Dispatcher, and CEO can update requests
CREATE POLICY "Admin and above can update service requests"
  ON service_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ceo', 'admin', 'dispatcher', 'administrator')
    )
  );

-- Update ships policies
DROP POLICY IF EXISTS "Admin and dispatcher can view ships" ON ships;
DROP POLICY IF EXISTS "Admin and dispatcher can create ships" ON ships;
DROP POLICY IF EXISTS "Admin and dispatcher can update ships" ON ships;
DROP POLICY IF EXISTS "Admin and dispatcher can delete ships" ON ships;
DROP POLICY IF EXISTS "Users can view all ships" ON ships;
DROP POLICY IF EXISTS "Admin and above can create ships" ON ships;
DROP POLICY IF EXISTS "Owners and CEO can update ships" ON ships;
DROP POLICY IF EXISTS "Owners and CEO can delete ships" ON ships;

CREATE POLICY "Users can view all ships"
  ON ships FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and above can create ships"
  ON ships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ceo', 'admin', 'dispatcher', 'administrator')
    )
  );

CREATE POLICY "Owners and CEO can update ships"
  ON ships FOR UPDATE
  TO authenticated
  USING (
    administrator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
    )
  );

CREATE POLICY "Owners and CEO can delete ships"
  ON ships FOR DELETE
  TO authenticated
  USING (
    administrator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
    )
  );
