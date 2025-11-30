/*
  # Onyx Services Dispatch System Schema

  ## Overview
  This migration creates the complete database schema for the Onyx Services dispatching system
  for Star Citizen operations including refueling, rescue, and medical services.

  ## New Tables

  ### `star_citizen_systems`
  Stores the 5 Star Citizen systems where services are offered
  - `id` (uuid, primary key)
  - `name` (text, unique) - System name (e.g., Stanton, Pyro, Nyx, Terra, Castra)
  - `code` (text, unique) - Short code for the system
  - `is_active` (boolean) - Whether services are currently available
  - `created_at` (timestamptz)

  ### `service_types`
  Available service types offered by Onyx Services
  - `id` (uuid, primary key)
  - `name` (text, unique) - Service name (refueling, rescue, medical)
  - `description` (text) - Service description
  - `is_active` (boolean) - Whether this service is currently offered
  - `created_at` (timestamptz)

  ### `service_requests`
  Client service request submissions from public intake form
  - `id` (uuid, primary key)
  - `service_type_id` (uuid, foreign key) - Type of service requested
  - `system_id` (uuid, foreign key) - Star Citizen system location
  - `client_name` (text) - Name of person requesting service
  - `client_discord` (text) - Discord username for contact
  - `location_details` (text) - Specific location within system
  - `description` (text) - Details about the service needed
  - `status` (text) - Request status: pending, assigned, in_progress, completed, cancelled
  - `priority` (text) - Priority level: low, medium, high, critical
  - `assigned_to` (uuid, nullable) - User ID of assigned crew member
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `completed_at` (timestamptz, nullable)

  ### `users`
  Authenticated dispatchers and crew members
  - `id` (uuid, primary key)
  - `discord_id` (text, unique) - Discord user ID
  - `discord_username` (text) - Discord username
  - `discord_avatar` (text, nullable) - Discord avatar URL
  - `role` (text) - User role: dispatcher, crew
  - `is_active` (boolean) - Account active status
  - `created_at` (timestamptz)
  - `last_login` (timestamptz)

  ### `request_notes`
  Notes and updates on service requests
  - `id` (uuid, primary key)
  - `request_id` (uuid, foreign key) - Associated service request
  - `user_id` (uuid, foreign key) - User who created the note
  - `note` (text) - Note content
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Public can INSERT into service_requests (intake form)
  - Public can SELECT from star_citizen_systems and service_types (for form dropdowns)
  - Authenticated users can view and manage requests
  - Only authenticated users can access users table and request_notes
  - Users can only update their own profile
*/

-- Create star_citizen_systems table
CREATE TABLE IF NOT EXISTS star_citizen_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create service_types table
CREATE TABLE IF NOT EXISTS service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id text UNIQUE NOT NULL,
  discord_username text NOT NULL,
  discord_avatar text,
  role text DEFAULT 'crew' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  last_login timestamptz DEFAULT now() NOT NULL
);

-- Create service_requests table
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id uuid REFERENCES service_types(id) NOT NULL,
  system_id uuid REFERENCES star_citizen_systems(id) NOT NULL,
  client_name text NOT NULL,
  client_discord text NOT NULL,
  location_details text NOT NULL,
  description text DEFAULT '' NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  priority text DEFAULT 'medium' NOT NULL,
  assigned_to uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz
);

-- Create request_notes table
CREATE TABLE IF NOT EXISTS request_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES service_requests(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) NOT NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE star_citizen_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for star_citizen_systems
CREATE POLICY "Anyone can view active systems"
  ON star_citizen_systems FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all systems"
  ON star_citizen_systems FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for service_types
CREATE POLICY "Anyone can view active service types"
  ON service_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all service types"
  ON service_types FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for users
CREATE POLICY "Users can view all active users"
  ON users FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = discord_id)
  WITH CHECK (auth.uid()::text = discord_id);

-- RLS Policies for service_requests
CREATE POLICY "Anyone can create service requests"
  ON service_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all requests"
  ON service_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update requests"
  ON service_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for request_notes
CREATE POLICY "Authenticated users can view all notes"
  ON request_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create notes"
  ON request_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert initial Star Citizen systems data
INSERT INTO star_citizen_systems (name, code, is_active) VALUES
  ('Stanton', 'STN', true),
  ('Pyro', 'PYR', true),
  ('Nyx', 'NYX', true),
  ('Terra', 'TER', true),
  ('Castra', 'CAS', true)
ON CONFLICT (name) DO NOTHING;

-- Insert initial service types data
INSERT INTO service_types (name, description, is_active) VALUES
  ('Refueling', 'Starship refueling services across all systems', true),
  ('Rescue', 'Emergency rescue and recovery operations', true),
  ('Medical', 'Medical assistance and emergency care', true)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_to ON service_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_request_notes_request_id ON request_notes(request_id);
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);