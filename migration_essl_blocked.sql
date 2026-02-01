-- Add essl_blocked flag to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS essl_blocked BOOLEAN DEFAULT false;
