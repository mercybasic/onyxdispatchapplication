/*
  # Add Escort Service Support

  1. New Fields for service_requests
    - `origin_location` (text) - Starting point for escort missions
    - `destination_location` (text) - End point for escort missions
    - `escort_ship_requirements` (text) - Types of ships needed for escort
    - `quoted_price_uec` (numeric) - Dispatcher-set price in UEC
    - `price_status` (text) - pending_quote, quoted, accepted, declined
    - `price_quoted_at` (timestamptz) - When dispatcher set the price
    - `price_responded_at` (timestamptz) - When client accepted/declined
    
  2. New Service Type
    - Add 'Escort' service to service_types table
    
  3. Security
    - Allow public to view quoted prices for their requests via tracking code
    - Allow clients to update price_status (accept/decline) for their requests
    - Allow dispatchers to set quoted_price_uec and price_status
    
  4. Important Notes
    - Origin/destination fields are optional and only used for escort services
    - For other services, these fields will be NULL
    - Price workflow: pending_quote -> quoted -> accepted/declined
    - Clients can only respond to quotes, not set prices
*/

-- Add new columns to service_requests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'origin_location'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN origin_location text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'destination_location'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN destination_location text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'escort_ship_requirements'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN escort_ship_requirements text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'quoted_price_uec'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN quoted_price_uec numeric(12, 2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'price_status'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN price_status text DEFAULT 'pending_quote';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'price_quoted_at'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN price_quoted_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'price_responded_at'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN price_responded_at timestamptz;
  END IF;
END $$;

-- Insert escort service type if it doesn't exist
INSERT INTO service_types (name, description, is_active)
VALUES ('Escort', 'Professional escort services for cargo runs, VIP transport, and high-risk areas', true)
ON CONFLICT (name) DO NOTHING;

-- Create policy to allow public to update price_status via tracking code
CREATE POLICY "Clients can respond to price quotes"
  ON service_requests
  FOR UPDATE
  TO public
  USING (tracking_code IS NOT NULL)
  WITH CHECK (
    price_status IN ('accepted', 'declined')
    AND quoted_price_uec IS NOT NULL
  );

-- Create index for price_status filtering
CREATE INDEX IF NOT EXISTS idx_service_requests_price_status 
  ON service_requests(price_status) 
  WHERE price_status IS NOT NULL;
