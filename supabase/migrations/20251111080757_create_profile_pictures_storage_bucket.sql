/*
  # Create Profile Pictures Storage Bucket

  ## Overview
  Create a storage bucket for user profile pictures with proper security policies.

  ## Changes
  1. New Storage Bucket
    - `profile-pictures` bucket for storing user profile images
    - Public bucket (images can be viewed by anyone)
    - File size limit: 5MB
    - Allowed file types: image/jpeg, image/png, image/webp, image/gif

  2. Security Policies
    - Anyone can view profile pictures (public read)
    - Only authenticated users can upload to their own folder
    - Users can only update/delete their own profile pictures
*/

-- Create the profile-pictures bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read profile pictures (public bucket)
CREATE POLICY "Public Access"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'profile-pictures');

-- Allow authenticated users to upload their own profile pictures
CREATE POLICY "Users can upload own profile picture"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update own profile picture"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own profile pictures
CREATE POLICY "Users can delete own profile picture"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );