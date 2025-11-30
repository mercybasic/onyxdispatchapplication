/*
  # Fix Security and Performance Issues

  ## Overview
  Addresses multiple security and performance concerns identified in the database audit:
  - Adds missing indexes on foreign keys for query performance
  - Optimizes RLS policies to avoid per-row function calls
  - Removes duplicate permissive policies
  - Removes unused index
  - Sets secure search paths on functions

  ## Changes

  ### 1. Add Missing Foreign Key Indexes
  - `crew_status.current_system_id` - for location queries
  - `request_notes.user_id` - for note author lookups
  - `service_requests.service_type_id` - for service filtering
  - `service_requests.system_id` - for location filtering

  ### 2. Optimize RLS Policies
  - Fix `users` table policy to use `(select auth.uid())` instead of `auth.uid()`
  - This prevents re-evaluation for each row, improving performance at scale

  ### 3. Remove Duplicate Permissive Policies
  - Keep only one SELECT policy per table for authenticated users
  - Remove redundant "Anyone can view" policies

  ### 4. Remove Unused Index
  - Drop `idx_service_requests_assigned_to` as it's not being used

  ### 5. Secure Function Search Paths
  - Set immutable search paths on trigger functions

  ## Security Notes
  - All changes maintain or improve security posture
  - Performance improvements do not compromise data protection
  - RLS policies remain restrictive and secure
*/

-- 1. Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_crew_status_current_system_id 
  ON crew_status(current_system_id);

CREATE INDEX IF NOT EXISTS idx_request_notes_user_id 
  ON request_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_service_type_id 
  ON service_requests(service_type_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_system_id 
  ON service_requests(system_id);

-- 2. Optimize RLS policy on users table
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- 3. Remove duplicate permissive policies

-- For service_types, keep only the authenticated users policy
DROP POLICY IF EXISTS "Anyone can view active service types" ON service_types;

-- For star_citizen_systems, keep only the authenticated users policy
DROP POLICY IF EXISTS "Anyone can view active systems" ON star_citizen_systems;

-- 4. Remove unused index
DROP INDEX IF EXISTS idx_service_requests_assigned_to;

-- 5. Secure function search paths

-- Recreate set_completed_at function with secure search path
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate update_crew_status_timestamp function with secure search path
CREATE OR REPLACE FUNCTION update_crew_status_timestamp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
