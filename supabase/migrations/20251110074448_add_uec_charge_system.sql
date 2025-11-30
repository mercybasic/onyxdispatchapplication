/*
  # Add UEC Charge System
  
  1. Changes to service_requests table
    - Add `uec_charge` column (numeric) - The amount of UEC to charge for the service
    - Add `charge_status` column (text) - Tracks whether client has accepted/declined ('pending', 'accepted', 'declined')
    - Add `charge_set_at` column (timestamptz) - When the dispatcher set the charge
    - Add `charge_responded_at` column (timestamptz) - When the client responded to the charge
  
  2. Security
    - Update RLS policies to allow clients to update charge_status and charge_responded_at
    - Dispatchers can set uec_charge and charge_set_at
    - Public read access remains for tracking
*/

-- Add UEC charge columns to service_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'uec_charge'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN uec_charge numeric(12, 2) DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'charge_status'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN charge_status text DEFAULT 'pending' CHECK (charge_status IN ('pending', 'accepted', 'declined'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'charge_set_at'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN charge_set_at timestamptz DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'charge_responded_at'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN charge_responded_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Drop existing policies to recreate them with new permissions
DROP POLICY IF EXISTS "Allow public read of service_requests" ON service_requests;
DROP POLICY IF EXISTS "Allow authenticated insert of service_requests" ON service_requests;
DROP POLICY IF EXISTS "Allow authenticated update of service_requests" ON service_requests;
DROP POLICY IF EXISTS "Allow authenticated delete of service_requests" ON service_requests;

-- Recreate policies with charge response permissions
CREATE POLICY "Allow public read of service_requests"
  ON service_requests
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert of service_requests"
  ON service_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update of service_requests"
  ON service_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public update of charge response"
  ON service_requests
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (charge_status IN ('accepted', 'declined') AND charge_responded_at IS NOT NULL);

CREATE POLICY "Allow authenticated delete of service_requests"
  ON service_requests
  FOR DELETE
  TO authenticated
  USING (true);