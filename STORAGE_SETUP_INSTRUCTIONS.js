#!/usr/bin/env node

/**
 * PowerFlex Storage Setup Script
 * Creates the "profiles" storage bucket with proper RLS policies
 * 
 * Run this in your Supabase SQL Editor or use Supabase Dashboard
 */

// Step 1: Create the storage bucket
// This needs to be done via Supabase Dashboard (cannot be done via SQL)
// 
// Manual Steps:
// 1. Go to https://app.supabase.com
// 2. Select your PowerFlex project
// 3. Go to Storage (left sidebar)
// 4. Click "Create New Bucket"
// 5. Name: "profiles"
// 6. Access: PUBLIC (allow public access)
// 7. Click "Create Bucket"

// Step 2: Add RLS Policies
// Run this SQL in the SQL Editor after creating the bucket

const setupSQL = `
-- RLS Policies for profiles bucket
-- Run this after creating the bucket in Supabase Dashboard

-- Policy 1: Users can upload profile photos to their own folder
CREATE POLICY "Users can upload profile photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'profiles'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Everyone can view profile photos (public read)
CREATE POLICY "Public can view profile photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'profiles');

-- Policy 3: Users can update their own profile photos
CREATE POLICY "Users can update own profile photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'profiles'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profiles'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can delete their own profile photos
CREATE POLICY "Users can delete own profile photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'profiles'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add avatar_url column to profiles if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url);
`;

console.log('PowerFlex Storage Setup Instructions\n');
console.log('=======================================\n');
console.log('STEP 1: Create Storage Bucket');
console.log('------------------------------');
console.log('1. Go to https://app.supabase.com');
console.log('2. Select your PowerFlex project');
console.log('3. Click "Storage" in the left sidebar');
console.log('4. Click "Create New Bucket"');
console.log('5. Fill in:');
console.log('   - Name: profiles');
console.log('   - Access: PUBLIC');
console.log('6. Click "Create Bucket"\n');

console.log('STEP 2: Run RLS Policies');
console.log('------------------------');
console.log('1. Go to SQL Editor in Supabase Dashboard');
console.log('2. Click "New Query"');
console.log('3. Copy and paste the SQL below:');
console.log('\n' + setupSQL);
console.log('\n4. Click "Run"');
console.log('5. Wait for success message\n');

console.log('STEP 3: Test Profile Photo Upload');
console.log('----------------------------------');
console.log('1. Restart your app (Ctrl+C and npm run dev)');
console.log('2. Log in to the app');
console.log('3. Go to Profile screen');
console.log('4. Click the edit button on your profile photo');
console.log('5. Select an image file');
console.log('6. Wait for upload to complete');
console.log('7. Verify your photo appears\n');

console.log('If you still get errors:');
console.log('- Check bucket name is exactly "profiles" (lowercase)');
console.log('- Check bucket access is set to PUBLIC');
console.log('- Verify RLS policies were created successfully');
console.log('- Check browser console for specific error message\n');
