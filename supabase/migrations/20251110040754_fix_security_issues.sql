/*
  # Fix Security Issues

  1. Index Improvements
    - Add missing index for `service_requests.assigned_to` foreign key
    - Remove unused indexes that don't improve query performance
    - Keep indexes that are used by foreign key constraints

  2. Function Security
    - Fix search_path for `generate_tracking_code` function
    - Fix search_path for `set_tracking_code` trigger function
    - Set explicit search_path to prevent SQL injection vulnerabilities

  3. Important Notes
    - Indexes on foreign keys improve JOIN performance
    - Unused indexes waste storage and slow down writes
    - Functions with mutable search_path are security vulnerabilities
    - Leaked password protection must be enabled in Supabase dashboard (not via SQL)
*/

-- Add missing index for assigned_to foreign key (improves JOIN performance)
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_to 
  ON service_requests(assigned_to) 
  WHERE assigned_to IS NOT NULL;

-- Drop unused indexes that don't provide value
DROP INDEX IF EXISTS idx_request_notes_user_id;
DROP INDEX IF EXISTS idx_service_requests_service_type_id;
DROP INDEX IF EXISTS idx_crew_status_current_system_id;
DROP INDEX IF EXISTS idx_service_requests_system_id;
DROP INDEX IF EXISTS request_messages_created_at_idx;

-- Keep request_messages_request_id_idx as it's used for filtering messages by request

-- Fix generate_tracking_code function with secure search_path
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- Fix set_tracking_code trigger function with secure search_path
CREATE OR REPLACE FUNCTION set_tracking_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := generate_tracking_code();
    WHILE EXISTS (SELECT 1 FROM service_requests WHERE tracking_code = NEW.tracking_code) LOOP
      NEW.tracking_code := generate_tracking_code();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;