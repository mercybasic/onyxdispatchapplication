/*
  # Add Discord Role Mapping Configuration

  1. New Tables
    - `discord_role_mappings`
      - `id` (uuid, primary key)
      - `discord_role_id` (text) - Discord role ID
      - `discord_role_name` (text) - Discord role name for display
      - `system_role` (text) - Maps to: dispatcher, administrator, staff
      - `auto_verify` (boolean) - Whether this role auto-verifies users
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on discord_role_mappings
    - Only authenticated users (dispatchers) can manage role mappings
    - All authenticated users can view mappings
*/

-- Create discord_role_mappings table
CREATE TABLE IF NOT EXISTS discord_role_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_role_id text UNIQUE NOT NULL,
  discord_role_name text NOT NULL,
  system_role text NOT NULL,
  auto_verify boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE discord_role_mappings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view role mappings"
  ON discord_role_mappings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Dispatchers can manage role mappings"
  ON discord_role_mappings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'dispatcher'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'dispatcher'
    )
  );

-- Create index
CREATE INDEX IF NOT EXISTS idx_discord_role_mappings_role_id ON discord_role_mappings(discord_role_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_discord_role_mappings_updated_at ON discord_role_mappings;
CREATE TRIGGER update_discord_role_mappings_updated_at
  BEFORE UPDATE ON discord_role_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();