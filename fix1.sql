-- Fix infinite recursion in profiles table
-- Drop all problematic policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Disable RLS on profiles table temporarily
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Enable RLS again with simple policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create simple policies without self-referential queries
-- Allow SELECT if user is accessing their own record
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow INSERT if user is creating their own profile
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow UPDATE if user is updating their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Fix gym_orders policies - drop all first
DROP POLICY IF EXISTS "Users can view their own orders" ON public.gym_orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.gym_orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_select_own" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_insert_own" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_update_own" ON public.gym_orders;

CREATE POLICY "gym_orders_select_own" ON public.gym_orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "gym_orders_insert_own" ON public.gym_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gym_orders_update_own" ON public.gym_orders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix gym_order_items policies - drop all first
DROP POLICY IF EXISTS "Users can view order items of their orders" ON public.gym_order_items;
DROP POLICY IF EXISTS "Authenticated users can insert order items" ON public.gym_order_items;
DROP POLICY IF EXISTS "Users can update their order items" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_select" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_insert" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_update" ON public.gym_order_items;

CREATE POLICY "gym_order_items_select" ON public.gym_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gym_orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "gym_order_items_insert" ON public.gym_order_items
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "gym_order_items_update" ON public.gym_order_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.gym_orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gym_orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

-- Fix gym_cart policies - drop all first
DROP POLICY IF EXISTS "Users can view their own cart" ON public.gym_cart;
DROP POLICY IF EXISTS "Users can insert items in their cart" ON public.gym_cart;
DROP POLICY IF EXISTS "Users can update their cart items" ON public.gym_cart;
DROP POLICY IF EXISTS "Users can delete their cart items" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_select" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_insert" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_update" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_delete" ON public.gym_cart;

CREATE POLICY "gym_cart_select" ON public.gym_cart
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "gym_cart_insert" ON public.gym_cart
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gym_cart_update" ON public.gym_cart
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gym_cart_delete" ON public.gym_cart
  FOR DELETE
  USING (auth.uid() = user_id);
