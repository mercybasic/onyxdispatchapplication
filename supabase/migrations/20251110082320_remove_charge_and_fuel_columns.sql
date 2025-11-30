/*
  # Remove Charge and Fuel Columns
  
  1. Changes to service_requests table
    - Drop policies that depend on charge columns
    - Remove `uec_charge` column
    - Remove `charge_status` column
    - Remove `charge_set_at` column
    - Remove `charge_responded_at` column
    - Remove `fuel_amount` column
    - Remove `fuel_price_per_unit` column
  
  2. Notes
    - Rolling back the UEC charge and fuel amount features
    - Must drop dependent policies before dropping columns
*/

-- Drop policies that depend on charge columns
DROP POLICY IF EXISTS "Allow public update of charge response" ON service_requests;

-- Remove charge and fuel-related columns from service_requests
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'uec_charge'
  ) THEN
    ALTER TABLE service_requests DROP COLUMN uec_charge;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'charge_status'
  ) THEN
    ALTER TABLE service_requests DROP COLUMN charge_status;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'charge_set_at'
  ) THEN
    ALTER TABLE service_requests DROP COLUMN charge_set_at;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'charge_responded_at'
  ) THEN
    ALTER TABLE service_requests DROP COLUMN charge_responded_at;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'fuel_amount'
  ) THEN
    ALTER TABLE service_requests DROP COLUMN fuel_amount;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'fuel_price_per_unit'
  ) THEN
    ALTER TABLE service_requests DROP COLUMN fuel_price_per_unit;
  END IF;
END $$;