/*
  # Add Public Read Access for Service Types and Systems

  1. Changes
    - Add policies to allow anonymous users to read service_types
    - Add policies to allow anonymous users to read star_citizen_systems
    
  2. Security
    - Only SELECT access is granted to anonymous users
    - Tables remain protected for INSERT, UPDATE, DELETE operations
*/

-- Allow anonymous users to view service types
CREATE POLICY "Anyone can view active service types"
  ON service_types
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Allow anonymous users to view star citizen systems  
CREATE POLICY "Anyone can view active systems"
  ON star_citizen_systems
  FOR SELECT
  TO anon
  USING (is_active = true);
