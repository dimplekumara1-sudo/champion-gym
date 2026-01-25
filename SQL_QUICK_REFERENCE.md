# SQL Migration Quick Reference

## File: migration_gym_shop_009.sql

### What to Do:
1. Open your Supabase Dashboard
2. Go to: SQL Editor → Create Query
3. Copy ALL contents from `migration_gym_shop_009.sql`
4. Paste into the SQL editor
5. Click "Run" button
6. Wait for success (should take 30-60 seconds)

### Key Tables Created:

| Table Name | Purpose | Key Fields |
|---|---|---|
| `gym_product_categories` | Product categories | name, icon, display_order, is_active |
| `gym_products` | All products | name, mrp, sale_price, purchase_price, stock_quantity, sku |
| `gym_bundled_products` | Bundle offers | bundle_price, discount_percentage, is_featured |
| `gym_bundled_product_items` | Items in bundles | bundle_id, product_id, quantity |
| `gym_cart` | Shopping carts | user_id, product_id, quantity |
| `gym_orders` | Customer orders | order_number, total_amount, payment_status, order_status |
| `gym_order_items` | Order line items | order_id, product_id, quantity, unit_price, line_total |
| `gym_sales_summary` | Daily sales data | date, total_orders, total_revenue, total_profit |
| `gym_purchase_orders` | Supplier orders | po_number, product_id, quantity, unit_cost |
| `gym_inventory_log` | Stock audit trail | product_id, log_type, quantity_change, previous_stock, new_stock |

### Security Features:
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Automatic authentication checks
- ✅ Admin-only product management
- ✅ Users can only access their own cart/orders
- ✅ 11 performance indexes included

### Sample Data:
The migration includes:
- 5 product categories
- 2 sample products (you can add more)

### After Migration:
Once complete, you can use these React components:
- `StoreScreen.tsx` - Customer product browsing
- `CartScreen.tsx` - Shopping cart & checkout
- `AdminShop.tsx` - Admin management dashboard

### Troubleshooting:
- If you get "admin_users not found" error → Create admin_users table first
- If SQL doesn't execute → Paste entire content without line breaks
- Check Supabase Logs if something fails

---

## Summary of What's Included:

### 📦 Product Management:
- Categories with icons and display order
- Products with MRP, sale price, purchase price
- Inventory tracking with reorder levels
- Bundle products (multiple items at discount)
- Featured products flag

### 🛒 Shopping Cart:
- Add/remove/update quantities
- Per-user cart isolation
- Automatic constraints (one product = one cart entry)

### 📋 Orders:
- Complete order lifecycle (pending → processing → shipped → delivered)
- Payment tracking (pending, paid, failed, refunded)
- Shipping address and phone storage
- Automatic tax calculation (18% GST)
- Order item line tracking

### 📊 Analytics & Reporting:
- Daily sales summary (automatic updates)
- Revenue, discount, cost, and profit tracking
- Inventory audit logs
- Purchase order tracking

### 🔐 Security:
- RLS policies prevent data leakage
- Admin authentication required for management
- User isolation for cart/orders
- Automatic timestamp tracking

---

## Ready to Use?

1. Copy file: `migration_gym_shop_009.sql`
2. Paste in Supabase SQL Editor
3. Click Run
4. Done! 🎉

Questions? Check: `SHOP_MIGRATION_GUIDE.md`
