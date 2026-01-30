-- Create push_notifications table
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id uuid not null default gen_random_uuid (),
  title character varying(255) not null,
  message text not null,
  link text null,
  target_user uuid null,
  is_read boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint push_notifications_pkey primary key (id),
  constraint push_notifications_target_user_fkey foreign KEY (target_user) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Create indexes
create index IF not exists idx_push_notifications_user_read on public.push_notifications using btree (target_user, is_read) TABLESPACE pg_default;
create index IF not exists idx_push_notifications_created_at on public.push_notifications using btree (created_at desc) TABLESPACE pg_default;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_push_notifications_updated_at ON public.push_notifications;

-- Create trigger
CREATE TRIGGER update_push_notifications_updated_at 
  BEFORE UPDATE ON push_notifications 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column ();

-- Enable RLS
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON push_notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON push_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON push_notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON push_notifications;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications" ON push_notifications
  FOR SELECT USING (
    auth.uid() = target_user OR target_user IS NULL
  );

CREATE POLICY "Admins can create notifications" ON push_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update their own notifications" ON push_notifications
  FOR UPDATE USING (
    auth.uid() = target_user
  );

CREATE POLICY "Admins can delete notifications" ON push_notifications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );