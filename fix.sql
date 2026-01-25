-- Add missing gst_percentage column to gym_products table
ALTER TABLE public.gym_products
ADD COLUMN IF NOT EXISTS gst_percentage numeric(5, 2) DEFAULT 18;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_gym_products_gst_percentage 
ON public.gym_products (gst_percentage);

-- Add comment to document the column
COMMENT ON COLUMN public.gym_products.gst_percentage IS 'GST percentage applicable to the product (default: 18%)';

-- Create profiles table with approval_status
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  full_name text NULL,
  username text NULL,
  phone_number text NULL,
  gender text NULL,
  weight numeric NULL,
  height numeric NULL,
  target_weight numeric NULL,
  goal text NULL,
  plan text NULL,
  onboarding_completed boolean NULL DEFAULT false,
  updated_at timestamp with time zone NULL DEFAULT now(),
  role text NULL DEFAULT 'user'::text,
  avatar_url text NULL,
  approval_status text NULL DEFAULT 'pending'::text,
  payment_status text NULL DEFAULT 'pending'::text,
  plan_id text NULL,
  plan_start_date timestamp with time zone NULL,
  plan_expiry_date timestamp with time zone NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT profiles_approval_status_check CHECK (
    (approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))
  ),
  CONSTRAINT profiles_payment_status_check CHECK (
    (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text]))
  ),
  CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text])))
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles (approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_payment_status ON public.profiles (payment_status);

-- Enable Row Level Security on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Drop problematic admin policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- Create gym_orders table
CREATE TABLE IF NOT EXISTS public.gym_orders (
  id bigserial NOT NULL,
  user_id uuid NULL,
  order_number text NOT NULL UNIQUE,
  order_status text NULL DEFAULT 'pending'::text,
  payment_status text NULL DEFAULT 'pending'::text,
  total_amount numeric(10, 2) NOT NULL,
  subtotal numeric(10, 2) NULL,
  tax_amount numeric(10, 2) NULL,
  discount_amount numeric(10, 2) NULL DEFAULT 0,
  delivery_address text NULL,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT gym_orders_pkey PRIMARY KEY (id),
  CONSTRAINT gym_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create gym_order_items table
CREATE TABLE IF NOT EXISTS public.gym_order_items (
  id bigserial NOT NULL,
  order_id bigint NOT NULL,
  product_id bigint NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10, 2) NOT NULL,
  line_total numeric(10, 2) NOT NULL,
  gst_percentage numeric(5, 2) NULL DEFAULT 18,
  gst_amount numeric(10, 2) NULL,
  created_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT gym_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT gym_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.gym_orders (id) ON DELETE CASCADE,
  CONSTRAINT gym_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.gym_products (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create gym_cart table
CREATE TABLE IF NOT EXISTS public.gym_cart (
  id bigserial NOT NULL,
  user_id uuid NOT NULL,
  product_id bigint NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT gym_cart_pkey PRIMARY KEY (id),
  CONSTRAINT gym_cart_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT gym_cart_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.gym_products (id) ON DELETE CASCADE,
  CONSTRAINT gym_cart_user_product_unique UNIQUE (user_id, product_id)
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gym_orders_user_id ON public.gym_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_gym_orders_status ON public.gym_orders (order_status);
CREATE INDEX IF NOT EXISTS idx_gym_order_items_order_id ON public.gym_order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_gym_order_items_product_id ON public.gym_order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_gym_cart_user_id ON public.gym_cart (user_id);

-- Enable RLS on all tables
ALTER TABLE public.gym_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_cart ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gym_orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.gym_orders;
CREATE POLICY "Users can view their own orders" ON public.gym_orders
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own orders" ON public.gym_orders;
CREATE POLICY "Users can create their own orders" ON public.gym_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own orders" ON public.gym_orders;
CREATE POLICY "Users can update their own orders" ON public.gym_orders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for gym_order_items - Allow authenticated users to insert (assumes order exists)
DROP POLICY IF EXISTS "Users can view order items of their orders" ON public.gym_order_items;
CREATE POLICY "Users can view order items of their orders" ON public.gym_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gym_orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert order items" ON public.gym_order_items;
CREATE POLICY "Authenticated users can insert order items" ON public.gym_order_items
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their order items" ON public.gym_order_items;
CREATE POLICY "Users can update their order items" ON public.gym_order_items
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

-- RLS Policies for gym_cart
DROP POLICY IF EXISTS "Users can view their own cart" ON public.gym_cart;
CREATE POLICY "Users can view their own cart" ON public.gym_cart
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert items in their cart" ON public.gym_cart;
CREATE POLICY "Users can insert items in their cart" ON public.gym_cart
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their cart items" ON public.gym_cart;
CREATE POLICY "Users can update their cart items" ON public.gym_cart
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their cart items" ON public.gym_cart;
CREATE POLICY "Users can delete their cart items" ON public.gym_cart
  FOR DELETE
  USING (auth.uid() = user_id);
