/*
  # Add User Qualifications System

  1. New Tables
    - `user_qualifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `qualification_code` (text) - P-BSC, P-MTC, P-EWQ, P-HVO, P-FTP
      - `qualification_name` (text) - Full name of qualification
      - `granted_by` (uuid, references users) - Admin/CEO who granted it
      - `granted_at` (timestamptz)
      - Unique constraint on (user_id, qualification_code)

  2. Security
    - Enable RLS on `user_qualifications` table
    - All authenticated users can read qualifications
    - Only admin and CEO roles can insert/update/delete qualifications

  3. Purpose
    - Track pilot qualifications and certifications
    - Allow admins to manage user qualifications
    - Display qualifications on user profiles
*/

-- Create user_qualifications table
CREATE TABLE IF NOT EXISTS user_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  qualification_code text NOT NULL CHECK (qualification_code IN ('P-BSC', 'P-MTC', 'P-EWQ', 'P-HVO', 'P-FTP')),
  qualification_name text NOT NULL,
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  granted_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, qualification_code)
);

ALTER TABLE user_qualifications ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read qualifications
CREATE POLICY "Anyone can view qualifications"
  ON user_qualifications
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admin and CEO can grant qualifications
CREATE POLICY "Admin and CEO can grant qualifications"
  ON user_qualifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'ceo')
    )
  );

-- Only admin and CEO can remove qualifications
CREATE POLICY "Admin and CEO can remove qualifications"
  ON user_qualifications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'ceo')
    )
  );

-- Add profile_picture column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'profile_picture'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_picture text;
  END IF;
END $$;