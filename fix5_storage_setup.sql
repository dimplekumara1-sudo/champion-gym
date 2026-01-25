-- Storage Setup for Profile Photos
-- This migration sets up storage policies for profile photo uploads
-- 
-- IMPORTANT: Before running this migration, you must:
-- 1. Create a Storage bucket named "profiles" in Supabase Dashboard
-- 2. Go to Storage > Buckets > Create New Bucket
-- 3. Name it "profiles"
-- 4. Set it to PUBLIC (Allow public access)
-- 5. Then run this SQL to set up RLS policies

-- Create policies for the profiles bucket
-- Users can upload to their own folder
CREATE POLICY "Users can upload profile photos to their own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can read all profile photos (public access)
CREATE POLICY "Public can view profile photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'profiles');

-- Users can update their own profile photos
CREATE POLICY "Users can update their own profile photos"
ON storage.objects
FOR UPDATE
USING (
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own profile photos
CREATE POLICY "Users can delete their own profile photos"
ON storage.objects
FOR DELETE
USING (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add avatar_url column to profiles if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url);

-- Grant permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
