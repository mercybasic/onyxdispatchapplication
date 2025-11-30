/*
  # Add Fuel Amount to Service Requests
  
  1. Changes to service_requests table
    - Add `fuel_amount` column (numeric) - The amount of fuel requested by the client
    - Add `fuel_price_per_unit` column (numeric) - The price per unit of fuel set by dispatcher
  
  2. Notes
    - These fields are only relevant for refueling service requests
    - The UEC charge will be calculated as fuel_amount * fuel_price_per_unit
    - Allows clients to specify exact fuel needs after initial request submission
*/

-- Add fuel-related columns to service_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'fuel_amount'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN fuel_amount numeric(12, 2) DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'fuel_price_per_unit'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN fuel_price_per_unit numeric(12, 2) DEFAULT NULL;
  END IF;
END $$;