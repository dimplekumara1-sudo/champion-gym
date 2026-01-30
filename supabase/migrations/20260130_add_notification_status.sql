-- Create a new table to track user-specific notification status
CREATE TABLE IF NOT EXISTS push_notification_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES push_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_notification_status_user_notification ON push_notification_status(user_id, notification_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_status_user_hidden ON push_notification_status(user_id, is_hidden);

-- Add updated_at trigger
CREATE TRIGGER update_push_notification_status_updated_at 
  BEFORE UPDATE ON push_notification_status 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE push_notification_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their notification status" ON push_notification_status;

-- Create RLS policy for notification status
CREATE POLICY "Users can manage their notification status" ON push_notification_status
  FOR ALL USING (
    auth.uid() = user_id
  );