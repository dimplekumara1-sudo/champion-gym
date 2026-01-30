-- Fix attendance table RLS policies
-- Admins should have full access to manage attendance
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;
CREATE POLICY "Admins can view all attendance"
  ON public.attendance FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins can insert attendance" ON public.attendance;
CREATE POLICY "Admins can insert attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins can update attendance" ON public.attendance;
CREATE POLICY "Admins can update attendance"
  ON public.attendance FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins can delete attendance" ON public.attendance;
CREATE POLICY "Admins can delete attendance"
  ON public.attendance FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Users can view their own attendance
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;
CREATE POLICY "Users can view their own attendance"
  ON public.attendance FOR SELECT
  USING (auth.uid() = user_id);
