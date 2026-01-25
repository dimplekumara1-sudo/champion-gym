-- Complete fix for infinite recursion - disable RLS on profiles
-- Drop ALL policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Disable RLS on profiles table completely
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Enable basic RLS with minimal policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Single simple policy for SELECT - authenticated users only
CREATE POLICY "profiles_read" ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Single simple policy for INSERT - authenticated users creating their own record
CREATE POLICY "profiles_write" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Single simple policy for UPDATE - authenticated users updating their own record
CREATE POLICY "profiles_modify" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Fix gym_cart policies - complete cleanup
DROP POLICY IF EXISTS "Users can view their own cart" ON public.gym_cart;
DROP POLICY IF EXISTS "Users can insert items in their cart" ON public.gym_cart;
DROP POLICY IF EXISTS "Users can update their cart items" ON public.gym_cart;
DROP POLICY IF EXISTS "Users can delete their cart items" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_select" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_insert" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_update" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_delete" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_read" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_create" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_edit" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_remove" ON public.gym_cart;

-- Recreate gym_cart policies
CREATE POLICY "gym_cart_read" ON public.gym_cart
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "gym_cart_create" ON public.gym_cart
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gym_cart_edit" ON public.gym_cart
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gym_cart_remove" ON public.gym_cart
  FOR DELETE
  USING (auth.uid() = user_id);

-- Fix gym_order_items policies
DROP POLICY IF EXISTS "Users can view order items of their orders" ON public.gym_order_items;
DROP POLICY IF EXISTS "Authenticated users can insert order items" ON public.gym_order_items;
DROP POLICY IF EXISTS "Users can update their order items" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_select" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_insert" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_update" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_read" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_create" ON public.gym_order_items;
DROP POLICY IF EXISTS "gym_order_items_edit" ON public.gym_order_items;

-- Recreate gym_order_items policies
CREATE POLICY "gym_order_items_read" ON public.gym_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gym_orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "gym_order_items_create" ON public.gym_order_items
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "gym_order_items_edit" ON public.gym_order_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.gym_orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

-- Fix gym_orders policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.gym_orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.gym_orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_select_own" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_insert_own" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_update_own" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_read" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_create" ON public.gym_orders;
DROP POLICY IF EXISTS "gym_orders_edit" ON public.gym_orders;

-- Recreate gym_orders policies
CREATE POLICY "gym_orders_read" ON public.gym_orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "gym_orders_create" ON public.gym_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gym_orders_edit" ON public.gym_orders
  FOR UPDATE
  USING (auth.uid() = user_id);
