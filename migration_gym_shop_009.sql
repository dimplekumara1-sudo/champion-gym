-- ============================================================================
-- MIGRATION 009: Gym Products Shop Management System
-- ============================================================================
-- This migration creates a complete shop management system for gym products
-- including products, categories, inventory, orders, and sales tracking
-- ============================================================================

-- 1. CREATE GYM PRODUCT CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS gym_product_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(255),
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE gym_product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_product_categories_read" ON gym_product_categories
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "gym_product_categories_admin" ON gym_product_categories
  FOR ALL TO authenticated
  USING (
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 2. CREATE GYM PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS gym_products (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES gym_product_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  main_image TEXT,
  images TEXT[] DEFAULT '{}',
  sku VARCHAR(100) UNIQUE,
  
  -- Pricing fields
  mrp DECIMAL(10, 2) NOT NULL,
  sale_price DECIMAL(10, 2) NOT NULL,
  purchase_price DECIMAL(10, 2),
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  
  -- Inventory
  stock_quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_bundled BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE gym_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_products_read" ON gym_products
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "gym_products_admin" ON gym_products
  FOR ALL TO authenticated
  USING (
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE INDEX idx_gym_products_category ON gym_products(category_id);
CREATE INDEX idx_gym_products_featured ON gym_products(is_featured) WHERE is_active = true;

-- 3. CREATE BUNDLED PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS gym_bundled_products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Pricing
  bundle_price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gym_bundled_product_items (
  id BIGSERIAL PRIMARY KEY,
  bundle_id BIGINT REFERENCES gym_bundled_products(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES gym_products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  UNIQUE(bundle_id, product_id)
);

ALTER TABLE gym_bundled_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_bundled_product_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_bundled_products_read" ON gym_bundled_products
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "gym_bundled_product_items_read" ON gym_bundled_product_items
  FOR SELECT TO authenticated
  USING (
    EXISTS(
      SELECT 1 FROM gym_bundled_products 
      WHERE id = bundle_id AND is_active = true
    )
  );

-- 4. CREATE SHOPPING CART TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS gym_cart (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES gym_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

ALTER TABLE gym_cart ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_cart_read" ON gym_cart
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "gym_cart_insert" ON gym_cart
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "gym_cart_update" ON gym_cart
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "gym_cart_delete" ON gym_cart
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_gym_cart_user ON gym_cart(user_id);

-- 5. CREATE ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS gym_orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number VARCHAR(20) UNIQUE NOT NULL,
  
  -- Order amounts
  subtotal DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  
  -- Status
  payment_status VARCHAR(50) DEFAULT 'pending',  -- pending, paid, failed, refunded
  order_status VARCHAR(50) DEFAULT 'pending',     -- pending, processing, shipped, delivered, cancelled
  
  -- Shipping
  shipping_address TEXT,
  phone_number VARCHAR(20),
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gym_order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES gym_orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES gym_products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  line_total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE gym_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_orders_read" ON gym_orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "gym_orders_insert" ON gym_orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "gym_orders_update" ON gym_orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "gym_order_items_read" ON gym_order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS(
      SELECT 1 FROM gym_orders 
      WHERE id = order_id 
      AND (user_id = auth.uid() OR EXISTS(
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
      ))
    )
  );

CREATE INDEX idx_gym_orders_user ON gym_orders(user_id);
CREATE INDEX idx_gym_orders_status ON gym_orders(order_status);
CREATE INDEX idx_gym_orders_created ON gym_orders(created_at DESC);
CREATE INDEX idx_gym_order_items_order ON gym_order_items(order_id);

-- 6. CREATE SALES SUMMARY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS gym_sales_summary (
  id BIGSERIAL PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE UNIQUE,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  total_discount DECIMAL(10, 2) DEFAULT 0,
  total_cost DECIMAL(10, 2) DEFAULT 0,
  total_profit DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE gym_sales_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_sales_summary_read" ON gym_sales_summary
  FOR SELECT TO authenticated
  USING (
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 7. CREATE PURCHASE INVENTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS gym_purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  po_number VARCHAR(20) UNIQUE NOT NULL,
  product_id BIGINT REFERENCES gym_products(id),
  
  -- Purchase details
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',  -- pending, ordered, received, cancelled
  
  -- Dates
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  received_date DATE,
  
  -- Notes
  supplier_name VARCHAR(255),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE gym_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_purchase_orders_admin" ON gym_purchase_orders
  FOR ALL TO authenticated
  USING (
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE INDEX idx_gym_purchase_orders_product ON gym_purchase_orders(product_id);
CREATE INDEX idx_gym_purchase_orders_status ON gym_purchase_orders(status);

-- 8. CREATE INVENTORY LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS gym_inventory_log (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES gym_products(id),
  
  -- Log type
  log_type VARCHAR(50),  -- sale, purchase, adjustment, damage, return
  
  -- Quantity change
  quantity_change INTEGER NOT NULL,
  reference_id VARCHAR(50),  -- order_id or purchase_order_id
  
  -- Previous and new stock
  previous_stock INTEGER,
  new_stock INTEGER,
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE gym_inventory_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_inventory_log_admin" ON gym_inventory_log
  FOR SELECT TO authenticated
  USING (
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE INDEX idx_gym_inventory_log_product ON gym_inventory_log(product_id);
CREATE INDEX idx_gym_inventory_log_created ON gym_inventory_log(created_at DESC);

-- 9. CREATE FUNCTIONS FOR AUTOMATION
-- ============================================================================

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
BEGIN
  RETURN 'ORD-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || 
         LPAD(NEXTVAL('gym_orders_id_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to calculate sales summary
CREATE OR REPLACE FUNCTION update_sales_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO gym_sales_summary (date, total_orders, total_revenue, total_discount, total_cost, total_profit)
  SELECT 
    CURRENT_DATE,
    COUNT(*),
    SUM(total_amount),
    SUM(discount_amount),
    SUM(COALESCE((
      SELECT SUM(gp.purchase_price * goi.quantity)
      FROM gym_order_items goi
      JOIN gym_products gp ON gp.id = goi.product_id
      WHERE goi.order_id = NEW.id
    ), 0)),
    SUM(total_amount) - SUM(COALESCE((
      SELECT SUM(gp.purchase_price * goi.quantity)
      FROM gym_order_items goi
      JOIN gym_products gp ON gp.id = goi.product_id
      WHERE goi.order_id = NEW.id
    ), 0))
  FROM gym_orders
  WHERE DATE(created_at) = CURRENT_DATE
  ON CONFLICT (date) DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_revenue = EXCLUDED.total_revenue,
    total_discount = EXCLUDED.total_discount,
    total_cost = EXCLUDED.total_cost,
    total_profit = EXCLUDED.total_profit,
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for sales summary update (on delivery status change)
DROP TRIGGER IF EXISTS trigger_update_sales_summary ON gym_orders;
CREATE TRIGGER trigger_update_sales_summary
AFTER UPDATE ON gym_orders
FOR EACH ROW
WHEN (NEW.order_status = 'delivered' AND OLD.order_status != 'delivered')
EXECUTE FUNCTION update_sales_summary();

-- 10. SAMPLE DATA (Optional - Comment out if not needed)
-- ============================================================================

-- Insert sample categories
INSERT INTO gym_product_categories (name, description, icon, display_order, is_active)
VALUES
  ('Supplements', 'Protein powders, vitamins, and nutritional supplements', 'local_pharmacy', 1, true),
  ('Equipment', 'Dumbbells, barbells, and workout equipment', 'fitness_center', 2, true),
  ('Clothing', 'Gym wear and athletic apparel', 'shopping_bag', 3, true),
  ('Accessories', 'Straps, gloves, water bottles, and more', 'backpack', 4, true),
  ('Recovery', 'Foam rollers, massage tools, and recovery products', 'spa', 5, true)
ON CONFLICT (name) DO NOTHING;

-- Insert sample products (optional)
INSERT INTO gym_products (category_id, name, description, sku, mrp, sale_price, purchase_price, discount_percentage, stock_quantity, is_featured)
VALUES
  (
    (SELECT id FROM gym_product_categories WHERE name = 'Supplements'),
    'Whey Protein 1kg',
    'High quality whey protein concentrate with 25g protein per serving',
    'WP-001',
    2500.00,
    1999.00,
    1200.00,
    20.04,
    50,
    true
  ),
  (
    (SELECT id FROM gym_product_categories WHERE name = 'Equipment'),
    'Adjustable Dumbbell Set',
    'Adjustable dumbbells ranging from 2-20kg',
    'DB-001',
    15000.00,
    12999.00,
    8000.00,
    13.34,
    15,
    true
  )
ON CONFLICT (sku) DO NOTHING;

-- ============================================================================
-- END OF MIGRATION 009
-- ============================================================================
-- Summary of created tables:
-- - gym_product_categories: Product categories with display order
-- - gym_products: Main products table with pricing and inventory
-- - gym_bundled_products: Bundle packages with multiple products
-- - gym_bundled_product_items: Items included in bundles
-- - gym_cart: Shopping cart for users
-- - gym_orders: Customer orders with payment/delivery status
-- - gym_order_items: Individual line items in orders
-- - gym_sales_summary: Daily aggregated sales data
-- - gym_purchase_orders: Purchase orders for inventory management
-- - gym_inventory_log: Audit trail for inventory changes
-- ============================================================================
