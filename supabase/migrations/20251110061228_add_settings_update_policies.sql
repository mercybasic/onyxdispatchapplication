/*
  # Add Update Policies for Settings Management

  1. Changes
    - Add UPDATE policy for service_types table
    - Add UPDATE policy for star_citizen_systems table
    - Allow authenticated users to update these settings

  2. Security
    - Only authenticated users can modify settings
    - Policies are restrictive to prevent unauthorized changes
*/

-- Add update policy for service_types
CREATE POLICY "Authenticated users can update service types"
  ON service_types
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add update policy for star_citizen_systems
CREATE POLICY "Authenticated users can update systems"
  ON star_citizen_systems
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
