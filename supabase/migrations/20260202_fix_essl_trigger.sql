
CREATE OR REPLACE FUNCTION public.queue_essl_user_update()
RETURNS TRIGGER AS $$
DECLARE
    cmd_text TEXT;
    expiry_str TEXT;
    block_str TEXT;
BEGIN
    -- Only proceed if user has an essl_id
    IF NEW.essl_id IS NULL OR NEW.essl_id = '' THEN
        RETURN NEW;
    END IF;

    -- Handle essl_blocked change
    IF (TG_OP = 'UPDATE' AND (OLD.essl_blocked IS DISTINCT FROM NEW.essl_blocked)) THEN
        IF NEW.essl_blocked THEN
            -- Block user by moving them to Access Group 99 (No Access)
            cmd_text := 'DATA UPDATE USER PIN=' || NEW.essl_id || ' Group=99';
        ELSE
            -- Unblock user by moving them to Access Group 1 (Full Access)
            cmd_text := 'DATA UPDATE USER PIN=' || NEW.essl_id || ' Group=1';
        END IF;

        INSERT INTO public.essl_commands (essl_id, command, status, payload)
        VALUES ('ALL', cmd_text, 'pending', jsonb_build_object('user_id', NEW.id, 'trigger', 'essl_blocked_change', 'pin', NEW.essl_id));
    END IF;

    -- Handle plan_expiry_date change
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.plan_expiry_date IS DISTINCT FROM NEW.plan_expiry_date))) THEN
        IF NEW.plan_expiry_date IS NOT NULL THEN
            -- Format: YYYYMMDDHHMMSS
            expiry_str := to_char(NEW.plan_expiry_date, 'YYYYMMDD') || '235959';
            
            -- Set the expiry date and ensure correct Access Group based on current date
            IF NEW.plan_expiry_date < CURRENT_DATE THEN
                cmd_text := 'DATA UPDATE USER PIN=' || NEW.essl_id || ' EndDateTime=' || expiry_str || ' Group=99';
            ELSE
                cmd_text := 'DATA UPDATE USER PIN=' || NEW.essl_id || ' EndDateTime=' || expiry_str || ' Group=1';
            END IF;
            
            INSERT INTO public.essl_commands (essl_id, command, status, payload)
            VALUES ('ALL', cmd_text, 'pending', jsonb_build_object('user_id', NEW.id, 'trigger', 'plan_expiry_change', 'pin', NEW.essl_id));
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
