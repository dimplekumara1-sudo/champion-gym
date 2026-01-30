-- Test the push_notifications table setup
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'push_notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'push_notifications';

-- Test creating a notification (this might fail if RLS is blocking)
INSERT INTO push_notifications (title, message, target_user, is_read)
VALUES ('Test', 'This is a test notification', NULL, false)
ON CONFLICT DO NOTHING;