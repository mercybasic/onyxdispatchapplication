/*
  # Consolidate Crew Management System

  ## Overview
  Consolidates the overlapping crew_status and crew_members tables into a unified system.
  
  ## Changes
  1. Add status fields to crew_members table for real-time crew tracking
  2. Add current_system_id to track location
  3. Keep crew_status table for backward compatibility but it will be phased out
  
  ## New Fields on crew_members
  - current_system_id: UUID reference to star_citizen_systems
  - is_on_duty: boolean indicating if crew member is currently active
  - notes: text field for additional status information
  - updated_at: timestamp for status updates
*/

-- Add new fields to crew_members table
ALTER TABLE crew_members 
  ADD COLUMN IF NOT EXISTS current_system_id uuid REFERENCES star_citizen_systems(id),
  ADD COLUMN IF NOT EXISTS is_on_duty boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- Update the updated_at trigger to fire on crew_members updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_crew_members_updated_at ON crew_members;

CREATE TRIGGER update_crew_members_updated_at
    BEFORE UPDATE ON crew_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add policy for crew members to update their own status
CREATE POLICY "Crew members can update own status"
  ON crew_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());