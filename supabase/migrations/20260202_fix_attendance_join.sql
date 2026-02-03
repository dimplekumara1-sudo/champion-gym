
-- Fix attendance to profiles relationship for easier joins
-- We remove the public. prefix to avoid issues if the schema search path is different
-- and use DO block to ensure the table exists before attempting to alter it

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'attendance') THEN
        -- Drop existing constraint if it exists
        ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;
        
        -- Add the correct foreign key to profiles
        ALTER TABLE attendance
        ADD CONSTRAINT attendance_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES profiles(id) 
        ON DELETE CASCADE;
    ELSE
        -- If table doesn't exist, create it (fallback)
        CREATE TABLE attendance (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
            essl_id TEXT,
            check_in TIMESTAMP WITH TIME ZONE,
            check_out TIMESTAMP WITH TIME ZONE,
            device_id TEXT,
            raw_data JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add RLS
        ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;
