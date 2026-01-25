-- Migration 010: Gym Orders Table Schema Update
-- This migration ensures the gym_orders table has all required columns and proper indexes

-- Add missing columns if they don't exist
ALTER TABLE public.gym_orders
  ADD COLUMN IF NOT EXISTS phone_number character varying(20),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP;

-- Update column defaults
ALTER TABLE public.gym_orders
  ALTER COLUMN gst_amount SET DEFAULT 0,
  ALTER COLUMN discount_amount SET DEFAULT 0,
  ALTER COLUMN tax_amount SET DEFAULT 0;

-- Create or replace indexes for performance
CREATE INDEX IF NOT EXISTS idx_gym_orders_user on public.gym_orders using btree (user_id);
CREATE INDEX IF NOT EXISTS idx_gym_orders_status on public.gym_orders using btree (order_status);
CREATE INDEX IF NOT EXISTS idx_gym_orders_created on public.gym_orders using btree (created_at desc);
CREATE INDEX IF NOT EXISTS idx_gym_orders_payment_status on public.gym_orders using btree (payment_status);

-- Ensure RLS is enabled
ALTER TABLE public.gym_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "gym_orders_view" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_admin_view" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_create" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_update" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_admin_update" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_delete" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_admin_delete" ON public.gym_orders;

-- Recreate policies with proper user and admin access
CREATE POLICY "gym_orders_view" ON public.gym_orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "gym_orders_admin_view" ON public.gym_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "gym_orders_create" ON public.gym_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gym_orders_update" ON public.gym_orders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gym_orders_admin_update" ON public.gym_orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "gym_orders_delete" ON public.gym_orders
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "gym_orders_admin_delete" ON public.gym_orders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for gym_order_items
ALTER TABLE public.gym_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gym_order_items_admin_delete" ON public.gym_order_items;

CREATE POLICY "gym_order_items_admin_delete" ON public.gym_order_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
