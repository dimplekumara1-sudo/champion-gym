-- Trigger to automatically queue eSSL commands for user expiry and blocking
CREATE OR REPLACE FUNCTION public.queue_essl_user_update()
RETURNS TRIGGER AS $$
DECLARE
    cmd_text TEXT;
    expiry_str TEXT;
BEGIN
    -- Only proceed if user has an essl_id
    IF NEW.essl_id IS NULL OR NEW.essl_id = '' THEN
        RETURN NEW;
    END IF;

    -- Handle essl_blocked change
    IF (TG_OP = 'UPDATE' AND (OLD.essl_blocked IS DISTINCT FROM NEW.essl_blocked)) THEN
        IF NEW.essl_blocked THEN
            -- Using USERINFO and tabs for better compatibility
            -- Enable=0 is the standard way to disable a user on ZK/eSSL devices
            cmd_text := 'DATA UPDATE USERINFO PIN=' || NEW.essl_id || E'\t' || 'Enable=0';
        ELSE
            cmd_text := 'DATA UPDATE USERINFO PIN=' || NEW.essl_id || E'\t' || 'Enable=1';
        END IF;

        INSERT INTO public.essl_commands (essl_id, command, status, payload)
        VALUES ('ALL', cmd_text, 'pending', jsonb_build_object('user_id', NEW.id, 'trigger', 'essl_blocked_change', 'pin', NEW.essl_id));
    END IF;

    -- Handle plan_expiry_date change
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.plan_expiry_date IS DISTINCT FROM NEW.plan_expiry_date))) THEN
        IF NEW.plan_expiry_date IS NOT NULL THEN
            -- Format: YYYYMMDDHHMMSS
            expiry_str := to_char(NEW.plan_expiry_date, 'YYYYMMDD') || '235959';
            
            -- If expiry date is in the past, explicitly set Enable=0 to ensure block
            IF NEW.plan_expiry_date < CURRENT_DATE THEN
                cmd_text := 'DATA UPDATE USERINFO PIN=' || NEW.essl_id || E'\t' || 'EndDateTime=' || expiry_str || E'\t' || 'Enable=0';
            ELSE
                cmd_text := 'DATA UPDATE USERINFO PIN=' || NEW.essl_id || E'\t' || 'EndDateTime=' || expiry_str || E'\t' || 'Enable=1';
            END IF;
            
            INSERT INTO public.essl_commands (essl_id, command, status, payload)
            VALUES ('ALL', cmd_text, 'pending', jsonb_build_object('user_id', NEW.id, 'trigger', 'plan_expiry_change', 'pin', NEW.essl_id));
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS queue_essl_user_update_trigger ON public.profiles;
CREATE TRIGGER queue_essl_user_update_trigger
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.queue_essl_user_update();
