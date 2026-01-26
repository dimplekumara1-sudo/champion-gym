-- Payment and Plan Tracking System
-- Features:
-- 1. Admin approval with payment confirmation and expiry selection
-- 2. 5-day expiry notifications before plan expires
-- 3. Payment collection for expired users
-- 4. Plan status transitions: pending -> active -> upcoming -> expired
-- 5. Partial payment tracking with due dates
-- 6. Phone number integration with call functionality
-- 7. Notification bell system for expiring plans

-- Add new columns to profiles table for payment and plan tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS due_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_due_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS plan_status text DEFAULT 'pending'::text,
ADD COLUMN IF NOT EXISTS last_expiry_notification_sent timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash'::text;

-- Add constraint for plan_status
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_plan_status_check CHECK (
  plan_status = ANY (ARRAY['free'::text, 'pending'::text, 'active'::text, 'upcoming'::text, 'expired'::text])
);

-- Add constraint for payment_method
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_payment_method_check CHECK (
  payment_method = ANY (ARRAY['cash'::text, 'upi'::text, 'card'::text])
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_plan_status ON public.profiles USING btree (plan_status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_profiles_plan_expiry_date ON public.profiles USING btree (plan_expiry_date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_profiles_payment_due_date ON public.profiles USING btree (payment_due_date) TABLESPACE pg_default;

-- Create function to automatically update plan_status based on expiry date
CREATE OR REPLACE FUNCTION public.update_plan_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan_expiry_date IS NOT NULL THEN
    IF NEW.plan_expiry_date <= NOW() THEN
      NEW.plan_status := 'expired'::text;
    ELSIF NEW.plan_expiry_date <= NOW() + INTERVAL '5 days' THEN
      NEW.plan_status := 'upcoming'::text;
    ELSIF NEW.approval_status = 'approved' THEN
      NEW.plan_status := 'active'::text;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update plan_status
DROP TRIGGER IF EXISTS update_plan_status_trigger ON public.profiles;
CREATE TRIGGER update_plan_status_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_plan_status();
