/*
  # Add Ships and Crew Management System

  1. New Tables
    - `ships`
      - `id` (uuid, primary key)
      - `name` (text) - Ship name
      - `ship_type` (text) - Type/class of ship
      - `call_sign` (text) - Radio call sign
      - `capabilities` (text[]) - Array of service capabilities
      - `status` (text) - active, maintenance, offline
      - `administrator_id` (uuid) - User who runs this ship
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `crew_members`
      - `id` (uuid, primary key)
      - `ship_id` (uuid, foreign key to ships)
      - `user_id` (uuid, foreign key to users)
      - `role` (text) - staff, administrator
      - `position` (text) - Pilot, Engineer, Medical, etc.
      - `status` (text) - active, inactive
      - `joined_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to Existing Tables
    - Add `role` column to users table (dispatcher, administrator, staff)
    - Add `verified` boolean to users table for role verification

  3. Security
    - Enable RLS on all new tables
    - Administrators can manage their own ships
    - Dispatchers can view all ships and crew
    - Staff can view their assigned ships
*/

-- Add role and verification to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role text DEFAULT 'staff';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'verified'
  ) THEN
    ALTER TABLE users ADD COLUMN verified boolean DEFAULT false;
  END IF;
END $$;

-- Create ships table
CREATE TABLE IF NOT EXISTS ships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ship_type text NOT NULL,
  call_sign text UNIQUE NOT NULL,
  capabilities text[] DEFAULT '{}',
  status text DEFAULT 'active',
  administrator_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create crew_members table
CREATE TABLE IF NOT EXISTS crew_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id uuid REFERENCES ships(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'staff',
  position text,
  status text DEFAULT 'active',
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ship_id, user_id)
);

-- Enable RLS
ALTER TABLE ships ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;

-- Ships policies
CREATE POLICY "Authenticated users can view all ships"
  ON ships
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can create ships"
  ON ships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('administrator', 'dispatcher')
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
      AND users.role = 'dispatcher'
      AND users.verified = true
    )
  )
  WITH CHECK (
    administrator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'dispatcher'
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
      AND users.role = 'dispatcher'
      AND users.verified = true
    )
  );

-- Crew members policies
CREATE POLICY "Authenticated users can view crew members"
  ON crew_members
  FOR SELECT
  TO authenticated
  USING (true);

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
      AND users.role = 'dispatcher'
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
      AND users.role = 'dispatcher'
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
      AND users.role = 'dispatcher'
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
      AND users.role = 'dispatcher'
      AND users.verified = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ships_administrator ON ships(administrator_id);
CREATE INDEX IF NOT EXISTS idx_ships_status ON ships(status);
CREATE INDEX IF NOT EXISTS idx_crew_members_ship ON crew_members(ship_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user ON crew_members(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_status ON crew_members(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(verified);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_ships_updated_at ON ships;
CREATE TRIGGER update_ships_updated_at
  BEFORE UPDATE ON ships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crew_members_updated_at ON crew_members;
CREATE TRIGGER update_crew_members_updated_at
  BEFORE UPDATE ON crew_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();