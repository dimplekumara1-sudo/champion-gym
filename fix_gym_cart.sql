-- Fix: Gym Cart Constraint Issues
-- This migration ensures gym_cart has proper unique constraints and handles upserts

-- Check if gym_cart table exists and has proper constraints
DO $$
BEGIN
  -- Drop existing unique constraint if it exists
  BEGIN
    ALTER TABLE public.gym_cart DROP CONSTRAINT IF EXISTS gym_cart_user_product_unique;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  
  -- Add unique constraint on user_id and product_id to prevent duplicates
  ALTER TABLE public.gym_cart 
    ADD CONSTRAINT gym_cart_user_product_unique UNIQUE (user_id, product_id);
    
EXCEPTION WHEN others THEN
  -- Table might not exist yet, which is fine
  NULL;
END
$$;

-- Create gym_cart table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.gym_cart (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id bigint not null references public.gym_products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamp with time zone default current_timestamp,
  updated_at timestamp with time zone default current_timestamp,
  unique(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.gym_cart ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "gym_cart_user_view" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_user_insert" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_user_update" ON public.gym_cart;
DROP POLICY IF EXISTS "gym_cart_user_delete" ON public.gym_cart;

-- RLS Policies - Users can only access their own cart
CREATE POLICY "gym_cart_user_view" ON public.gym_cart
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "gym_cart_user_insert" ON public.gym_cart
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gym_cart_user_update" ON public.gym_cart
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gym_cart_user_delete" ON public.gym_cart
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gym_cart_user ON public.gym_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_cart_product ON public.gym_cart(product_id);
