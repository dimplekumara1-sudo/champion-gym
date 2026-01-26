# Challenge Gym Gym Shop Management System - SQL Migrations Guide

## Overview
This document provides all the SQL migrations needed to set up the complete shop management system for Challenge Gym Elite Fitness Coach application.

## Migration File Location
📁 **File:** `migration_gym_shop_009.sql`

## How to Run the Migrations

### Option 1: Using Supabase SQL Editor (Recommended)
1. Go to Supabase Dashboard → Your Project
2. Navigate to **SQL Editor**
3. Click **"Create Query"** or **"New Query"**
4. Copy the entire contents of `migration_gym_shop_009.sql`
5. Paste it into the SQL editor
6. Click **"Run"** button
7. Wait for all migrations to complete successfully

### Option 2: Using PostgreSQL CLI
```bash
psql -h your-supabase-host -U postgres -d your-database < migration_gym_shop_009.sql
```

### Option 3: Using pgAdmin
1. Open pgAdmin and connect to your Supabase database
2. Right-click your database → **Query Tool**
3. Copy and paste the SQL migration file
4. Execute the query

---

## What Gets Created

### Tables Created:

#### 1. **gym_product_categories**
- Stores product categories with icons and display order
- Used for organizing products in the store

#### 2. **gym_products**
- Main products table with complete pricing and inventory
- Includes MRP, sale price, purchase price, and discount tracking
- Features SKU, stock quantity, reorder level

#### 3. **gym_bundled_products**
- Stores bundle offers (multiple products at discounted price)
- Tracks bundle pricing and discount percentage

#### 4. **gym_bundled_product_items**
- Individual products included in bundles
- Links products to bundles with quantities

#### 5. **gym_cart**
- User shopping cart items
- Tracks product quantity per user
- Unique constraint: one product per user per cart

#### 6. **gym_orders**
- Customer orders with payment and delivery status
- Tracks subtotal, discount, tax, and total amount
- Stores shipping address and phone number

#### 7. **gym_order_items**
- Individual line items in orders
- Links products to orders with quantities and prices

#### 8. **gym_sales_summary**
- Daily aggregated sales data
- Tracks total orders, revenue, discount, cost, and profit
- Used for analytics and reporting

#### 9. **gym_purchase_orders**
- Purchase orders for inventory management
- Tracks supplier, cost, expected delivery
- Helps manage stock replenishment

#### 10. **gym_inventory_log**
- Audit trail for all inventory changes
- Records sales, purchases, adjustments, damage, returns
- Tracks stock levels before and after each transaction

---

## Features Included

### ✅ Complete Pricing System
- MRP (Maximum Retail Price)
- Sale Price
- Purchase Price (for cost tracking)
- Automatic discount calculation

### ✅ Inventory Management
- Real-time stock tracking
- Reorder level alerts
- Inventory audit logs
- Stock movement history

### ✅ Order Management
- Order status tracking (pending, processing, shipped, delivered, cancelled)
- Payment status tracking (pending, paid, failed, refunded)
- Shipping details and contact information
- Tax calculation (18% GST)

### ✅ Sales Analytics
- Daily sales summary
- Revenue tracking
- Profit calculation
- Discount analysis

### ✅ Bundle System
- Create product bundles
- Apply bundle discounts
- Track bundled items

### ✅ Security (Row Level Security - RLS)
- Users can only see their own cart and orders
- Only admins can manage products, categories, and inventory
- Automatic authentication checks on all operations

---

## Sample Data

The migration includes sample data:
- 5 Product Categories (Supplements, Equipment, Clothing, Accessories, Recovery)
- 2 Sample Products (Whey Protein 1kg, Adjustable Dumbbell Set)

To remove sample data, comment out or delete the section:
```sql
-- 10. CREATE SAMPLE DATA (Optional - Comment out if not needed)
```

---

## Database Functions Created

### 1. `generate_order_number()`
Automatically generates unique order numbers in format: `ORD-YYYYMMDD-XXXXX`

### 2. `update_sales_summary()`
Automatically updates daily sales summary when orders are delivered

### 3. Trigger: `trigger_update_sales_summary`
Automatically executes the sales summary update when order status is set to 'delivered'

---

## Required Supabase Setup

Before running migrations, ensure:
1. ✅ Supabase project is created
2. ✅ `auth.users` table exists (created automatically by Supabase)
3. ✅ `admin_users` table exists (used for admin authentication)

---

## SQL Performance Optimizations

### Indexes Created:
- `idx_gym_products_category` - Fast product filtering by category
- `idx_gym_products_featured` - Quick featured products retrieval
- `idx_gym_cart_user` - Fast user cart lookup
- `idx_gym_orders_user` - Quick user order retrieval
- `idx_gym_orders_status` - Order status filtering
- `idx_gym_orders_created` - Order date sorting
- `idx_gym_order_items_order` - Order line items lookup
- `idx_gym_purchase_orders_product` - Purchase order filtering
- `idx_gym_purchase_orders_status` - Purchase order status filtering
- `idx_gym_inventory_log_product` - Inventory history by product
- `idx_gym_inventory_log_created` - Inventory log date sorting

---

## RLS (Row Level Security) Policies

### Users Can:
- ✅ Read all active products
- ✅ Read/Update/Delete their own cart items
- ✅ Create orders
- ✅ View their own orders

### Admins Can:
- ✅ Manage (CRUD) all products
- ✅ Manage categories
- ✅ Update order status and payment status
- ✅ Access inventory logs and sales data
- ✅ View all orders and purchase orders

---

## API Endpoints to Build

Once migrations are done, you can build these endpoints:

### Public Endpoints:
```
GET  /api/products                 - List all products
GET  /api/products/:id             - Get product details
GET  /api/categories               - List all categories
GET  /api/bundles                  - List all bundles
```

### User Endpoints:
```
GET  /api/cart                     - Get user's cart
POST /api/cart/items               - Add to cart
PUT  /api/cart/items/:id           - Update quantity
DELETE /api/cart/items/:id         - Remove from cart
POST /api/orders                   - Create new order
GET  /api/orders                   - Get user's orders
GET  /api/orders/:id               - Get order details
```

### Admin Endpoints:
```
POST /api/admin/products           - Create product
PUT  /api/admin/products/:id       - Update product
DELETE /api/admin/products/:id     - Delete product
POST /api/admin/categories         - Create category
PUT  /api/admin/orders/:id/status  - Update order status
GET  /api/admin/sales-summary      - Get sales analytics
GET  /api/admin/inventory-log      - Get inventory history
```

---

## Troubleshooting

### Error: "relation 'admin_users' does not exist"
**Solution:** Ensure admin_users table is created first. This should exist in your migration setup.

### Error: "syntax error in SQL statement"
**Solution:** Make sure you're using PostgreSQL (not MySQL) and Supabase's SQL editor.

### Error: "Permission denied"
**Solution:** Ensure you have admin access to the database and the policy checks reference the correct admin_users table.

---

## Migration Statistics

- **Total Tables Created:** 10
- **Total Indexes Created:** 11
- **Total Policies Created:** 15+
- **Functions Created:** 2
- **Triggers Created:** 1
- **Estimated Migration Time:** 30-60 seconds

---

## Next Steps

After migrations are complete:

1. ✅ Run migrations in Supabase SQL Editor
2. ✅ Verify all tables created in Supabase dashboard
3. ✅ Update TypeScript types based on table structure
4. ✅ Implement React components (provided: StoreScreen, CartScreen, AdminShop)
5. ✅ Create API endpoints for cart and order management
6. ✅ Set up payment integration (Razorpay, Stripe, etc.)
7. ✅ Add order notification system
8. ✅ Implement admin dashboard analytics

---

## File Structure

```
migration_gym_shop_009.sql          ← SQL migrations file
StoreScreen.tsx                      ← User store with product browsing
CartScreen.tsx                       ← Shopping cart interface
AdminShop.tsx                        ← Admin shop management
```

---

## Support & Documentation

For more information:
- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- RLS Policy Guide: https://supabase.com/docs/guides/auth/row-level-security

---

**Last Updated:** January 25, 2026
**Version:** 1.0
