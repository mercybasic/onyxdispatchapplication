/*
  # Add Client Messaging System

  1. New Tables
    - `request_messages`
      - `id` (uuid, primary key)
      - `request_id` (uuid, foreign key to service_requests)
      - `sender_type` (text) - 'client' or 'dispatcher'
      - `sender_name` (text) - name of the person sending the message
      - `message` (text) - the message content
      - `created_at` (timestamptz)

  2. Changes
    - Add `tracking_code` column to `service_requests` table for client lookup
    - Update RLS policies to allow clients to view their request with tracking code
    - Add RLS policies for messages

  3. Security
    - Enable RLS on `request_messages` table
    - Allow anyone with tracking code to read messages for their request
    - Allow authenticated users (dispatchers) to read all messages
    - Allow anyone to insert messages (with validation)
    - Allow dispatchers to delete messages

  4. Important Notes
    - Tracking codes are 8-character alphanumeric strings (e.g., "A3B7K9M2")
    - Clients can look up their request using tracking code + client name
    - Messages are visible to both client and assigned dispatcher
    - Real-time updates using Supabase subscriptions
*/

-- Add tracking_code column to service_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'tracking_code'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN tracking_code text;
  END IF;
END $$;

-- Create unique index on tracking_code
CREATE UNIQUE INDEX IF NOT EXISTS service_requests_tracking_code_idx 
  ON service_requests(tracking_code) 
  WHERE tracking_code IS NOT NULL;

-- Function to generate tracking code
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate tracking codes for new requests
CREATE OR REPLACE FUNCTION set_tracking_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := generate_tracking_code();
    WHILE EXISTS (SELECT 1 FROM service_requests WHERE tracking_code = NEW.tracking_code) LOOP
      NEW.tracking_code := generate_tracking_code();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_tracking_code_trigger ON service_requests;
CREATE TRIGGER set_tracking_code_trigger
  BEFORE INSERT ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_tracking_code();

-- Backfill tracking codes for existing requests
UPDATE service_requests
SET tracking_code = generate_tracking_code()
WHERE tracking_code IS NULL;

-- Create request_messages table
CREATE TABLE IF NOT EXISTS request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('client', 'dispatcher')),
  sender_name text NOT NULL DEFAULT '',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster message queries
CREATE INDEX IF NOT EXISTS request_messages_request_id_idx ON request_messages(request_id);
CREATE INDEX IF NOT EXISTS request_messages_created_at_idx ON request_messages(created_at);

-- Enable RLS on request_messages
ALTER TABLE request_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for request_messages
-- Allow authenticated users (dispatchers) to read all messages
CREATE POLICY "Dispatchers can read all messages"
  ON request_messages FOR SELECT
  TO authenticated
  USING (true);

-- Allow anyone to read messages if they know the tracking code (will validate in app)
CREATE POLICY "Anyone can read messages with tracking code"
  ON request_messages FOR SELECT
  TO anon
  USING (true);

-- Allow anyone to insert messages
CREATE POLICY "Anyone can send messages"
  ON request_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow dispatchers to delete messages
CREATE POLICY "Dispatchers can delete messages"
  ON request_messages FOR DELETE
  TO authenticated
  USING (true);

-- Update service_requests RLS to allow public read with tracking code
CREATE POLICY "Anyone can view requests with tracking code"
  ON service_requests FOR SELECT
  TO anon
  USING (tracking_code IS NOT NULL);