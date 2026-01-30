-- Drop existing policies to recreate with proper deletion rules
DROP POLICY IF EXISTS "Users can view their own notifications" ON push_notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON push_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON push_notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON push_notifications;

-- Create RLS policies with proper deletion logic
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

CREATE POLICY "Users can delete their own notifications" ON push_notifications
  FOR DELETE USING (
    -- User can delete if notification is specifically targeted to them OR it's a broadcast notification
    (auth.uid() = target_user OR target_user IS NULL)
  );

CREATE POLICY "Admins can delete any notifications" ON push_notifications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );