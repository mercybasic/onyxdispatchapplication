/*
  # Add Fuel Type Selection for Refueling Requests

  1. Changes
    - Add `fuel_type` column to `service_requests` table
      - Stores the type of fuel requested: 'hydrogen', 'quantum', or 'both'
      - Only applicable for refueling service requests
      - Allows dispatchers to know what fuel to bring

  2. Notes
    - This field will be NULL for non-refueling requests
    - Frontend will only show this field when Refueling service is selected
*/

-- Add fuel_type column to service_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'fuel_type'
  ) THEN
    ALTER TABLE service_requests 
    ADD COLUMN fuel_type text CHECK (fuel_type IN ('hydrogen', 'quantum', 'both'));
  END IF;
END $$;