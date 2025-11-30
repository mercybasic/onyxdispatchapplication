/*
  # Fix Fuel Type Check Constraint

  1. Overview
    - Allow fuel_type to be NULL for non-refueling service requests
    - Only enforce fuel_type values when the field is not NULL
    - This fixes errors when submitting escort and other non-refueling requests

  2. Changes
    - Drop the existing fuel_type check constraint
    - Add a new constraint that allows NULL or valid fuel types

  3. Security
    - No RLS changes needed
*/

-- Drop the existing constraint
ALTER TABLE service_requests 
DROP CONSTRAINT IF EXISTS service_requests_fuel_type_check;

-- Add new constraint that allows NULL
ALTER TABLE service_requests 
ADD CONSTRAINT service_requests_fuel_type_check 
CHECK (fuel_type IS NULL OR fuel_type IN ('hydrogen', 'quantum', 'both'));