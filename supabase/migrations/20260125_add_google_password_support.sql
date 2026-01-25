-- Add has_password column to profiles table for Google OAuth password setup tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT false;

-- Add category_id column to explore_videos if it doesn't exist
ALTER TABLE explore_videos ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES workout_categories(id) ON DELETE SET NULL;

-- Create index on category_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_explore_videos_category_id ON explore_videos(category_id);
