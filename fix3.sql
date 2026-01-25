-- Add admin visibility to gym orders
-- Allow users to view their own orders

-- Add missing columns to gym_orders table
ALTER TABLE public.gym_orders
  ADD COLUMN IF NOT EXISTS shipping_address text,
  ADD COLUMN IF NOT EXISTS subtotal numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount numeric(10, 2) DEFAULT 0;

-- Drop existing gym_orders policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.gym_orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.gym_orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_select_own" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_insert_own" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_update_own" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_read" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_create" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_edit" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_view" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_update" ON public.gym_orders;

-- Simple policy: Users can view their own orders
CREATE POLICY "gym_orders_view" ON public.gym_orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all orders
CREATE POLICY "gym_orders_admin_view" ON public.gym_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Users can create orders
CREATE POLICY "gym_orders_create" ON public.gym_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own orders
CREATE POLICY "gym_orders_update" ON public.gym_orders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can update any order
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

-- Drop existing gym_order_items policies
DROP POLICY IF EXISTS "Users can view order items of their orders" ON public.gym_order_items;
DROP POLICY IF EXISTS "Authenticated users can insert order items" ON public.gym_order_items;
DROP POLICY IF EXISTS "Users can update their order items" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_select" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_insert" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_update" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_read" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_create" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_edit" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_view" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_update" ON public.gym_order_items;

-- Simple policy: Users can view items from their orders
CREATE POLICY "gym_order_items_view" ON public.gym_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gym_orders go
      WHERE go.id = order_id AND go.user_id = auth.uid()
    )
  );

-- Policy: Admins can view all order items
CREATE POLICY "gym_order_items_admin_view" ON public.gym_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Anyone authenticated can insert items
CREATE POLICY "gym_order_items_create" ON public.gym_order_items
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can update items from their orders
CREATE POLICY "gym_order_items_update" ON public.gym_order_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.gym_orders go
      WHERE go.id = order_id AND go.user_id = auth.uid()
    )
  );

-- Policy: Admins can update any order items
CREATE POLICY "gym_order_items_admin_update" ON public.gym_order_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Ensure tables have RLS enabled
ALTER TABLE public.gym_order_items ENABLE ROW LEVEL SECURITY;
