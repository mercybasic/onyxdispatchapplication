/*
  # Add Crew Status Tracking

  ## Overview
  Adds crew status tracking to allow crew members and dispatchers to indicate
  their current ship, capabilities, and active system location.

  ## New Tables

  ### `crew_status`
  Tracks the current status and capabilities of crew members
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - References users table
  - `ship_name` (text) - Name/type of ship currently using
  - `current_system_id` (uuid, foreign key, nullable) - Current star system location
  - `is_active` (boolean) - Whether crew member is currently active/on duty
  - `has_tier1_beds` (boolean) - Has Tier 1 medical beds available
  - `has_tier2_beds` (boolean) - Has Tier 2 medical beds available
  - `has_tier3_beds` (boolean) - Has Tier 3 medical beds available
  - `has_quantum_fuel` (boolean) - Can provide quantum fuel
  - `has_hydrogen_fuel` (boolean) - Can provide hydrogen fuel
  - `notes` (text) - Additional notes about capabilities/status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on crew_status table
  - Authenticated users can view all crew status
  - Users can only update their own status
  - Dispatchers can view all statuses

  ## Important Notes
  - Each user can only have one active crew status record
  - Users update their status as needed
  - Status helps dispatchers assign appropriate crew to requests
*/

-- Create crew_status table
CREATE TABLE IF NOT EXISTS crew_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ship_name text DEFAULT '' NOT NULL,
  current_system_id uuid REFERENCES star_citizen_systems(id) ON DELETE SET NULL,
  is_active boolean DEFAULT false NOT NULL,
  has_tier1_beds boolean DEFAULT false NOT NULL,
  has_tier2_beds boolean DEFAULT false NOT NULL,
  has_tier3_beds boolean DEFAULT false NOT NULL,
  has_quantum_fuel boolean DEFAULT false NOT NULL,
  has_hydrogen_fuel boolean DEFAULT false NOT NULL,
  notes text DEFAULT '' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE crew_status ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all crew status
CREATE POLICY "Authenticated users can view all crew status"
  ON crew_status
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can insert their own status
CREATE POLICY "Users can insert own status"
  ON crew_status
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own status
CREATE POLICY "Users can update own status"
  ON crew_status
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own status
CREATE POLICY "Users can delete own status"
  ON crew_status
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crew_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_crew_status_timestamp ON crew_status;
CREATE TRIGGER trigger_update_crew_status_timestamp
  BEFORE UPDATE ON crew_status
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_status_timestamp();
