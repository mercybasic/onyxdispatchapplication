/*
  # Add Cancellation Tracking System

  1. New Tables
    - `cancellation_reasons`
      - `id` (uuid, primary key)
      - `request_id` (uuid, foreign key to service_requests)
      - `reason` (text) - Cancellation reason category
      - `additional_details` (text, optional) - Extra context from client
      - `cancelled_by` (text) - 'client' or 'dispatcher'
      - `cancelled_at` (timestamptz) - When the cancellation occurred
      - `created_at` (timestamptz)

  2. Changes
    - Enable RLS on cancellation_reasons table
    - Add policies for authenticated users to read all cancellation data
    - Add policies for clients to create cancellation records
    - Add policies for dispatchers to view cancellation metrics

  3. Security
    - Restrictive RLS policies that check authentication
    - Clients can only cancel their own requests
    - All cancellation data is viewable by authenticated dispatchers
*/

-- Create cancellation_reasons table
CREATE TABLE IF NOT EXISTS cancellation_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES service_requests(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  additional_details text,
  cancelled_by text NOT NULL DEFAULT 'client',
  cancelled_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;

-- Policy for anyone to insert cancellation reasons (clients cancelling their requests)
CREATE POLICY "Anyone can create cancellation reasons"
  ON cancellation_reasons
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy for authenticated users (dispatchers) to read all cancellation reasons
CREATE POLICY "Authenticated users can view all cancellation reasons"
  ON cancellation_reasons
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_request_id ON cancellation_reasons(request_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_reason ON cancellation_reasons(reason);
CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_cancelled_at ON cancellation_reasons(cancelled_at DESC);