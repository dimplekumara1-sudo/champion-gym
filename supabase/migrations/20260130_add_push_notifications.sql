-- Create push_notifications table
CREATE TABLE IF NOT EXISTS push_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- Optional URL to redirect when notification is clicked
  target_user UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for broadcast to all users
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications (or all if target_user is NULL)
CREATE POLICY "Users can view their own notifications" ON push_notifications
  FOR SELECT USING (
    auth.uid() = target_user OR target_user IS NULL
  );

-- Only admins can insert notifications
CREATE POLICY "Admins can create notifications" ON push_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can only update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON push_notifications
  FOR UPDATE USING (
    auth.uid() = target_user
  );

-- Only admins can delete notifications
CREATE POLICY "Admins can delete notifications" ON push_notifications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for performance
CREATE INDEX idx_push_notifications_user_read ON push_notifications(target_user, is_read);
CREATE INDEX idx_push_notifications_created_at ON push_notifications(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_push_notifications_updated_at 
  BEFORE UPDATE ON push_notifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();