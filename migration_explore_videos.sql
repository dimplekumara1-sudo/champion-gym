-- Migration: Create explore_videos table for managing Explore page content
-- This table stores premium video lessons including yoga, weight loss, tips, strength, and training videos

CREATE TABLE IF NOT EXISTS public.explore_videos (
  id uuid primary key default gen_random_uuid(),
  title varchar(255) not null,
  description text,
  video_url text not null,
  thumbnail_url text,
  type varchar(50) not null, -- yoga, weight-loss, tips, strength, lesson, training
  category_id uuid references public.workout_categories(id) on delete set null,
  duration_minutes integer,
  difficulty varchar(20), -- beginner, intermediate, advanced
  badges text[], -- array of badge labels: New, Popular, Trending, Hot, etc
  is_featured boolean default false,
  is_premium boolean default false,
  created_at timestamp with time zone default current_timestamp,
  updated_at timestamp with time zone default current_timestamp
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_explore_videos_type ON public.explore_videos(type);
CREATE INDEX IF NOT EXISTS idx_explore_videos_category ON public.explore_videos(category_id);
CREATE INDEX IF NOT EXISTS idx_explore_videos_featured ON public.explore_videos(is_featured);
CREATE INDEX IF NOT EXISTS idx_explore_videos_premium ON public.explore_videos(is_premium);
CREATE INDEX IF NOT EXISTS idx_explore_videos_created ON public.explore_videos(created_at desc);

-- Enable RLS
ALTER TABLE public.explore_videos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "explore_videos_user_view" ON public.explore_videos;
DROP POLICY IF EXISTS "explore_videos_admin_manage" ON public.explore_videos;

-- RLS Policies - Users can view, admins can manage
CREATE POLICY "explore_videos_user_view" ON public.explore_videos
  FOR SELECT
  USING (true); -- Everyone can view explore videos

CREATE POLICY "explore_videos_admin_manage" ON public.explore_videos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
