# Troubleshooting: Size Not Showing in Orders After Checkout

## Issue
Size selected in carts is not showing up in orders after checkout.

## Debugging Steps

### Step 1: Check if Database Columns Exist
Run this SQL to check if the columns exist:

```sql
-- Check if size column exists in carts table
DESCRIBE carts;

-- Check if size column exists in orders table  
DESCRIBE orders;

-- If columns don't exist, run these:
ALTER TABLE `carts` ADD COLUMN `size` VARCHAR(10) DEFAULT 'M' AFTER `quantity`;
ALTER TABLE `orders` ADD COLUMN `size` VARCHAR(10) DEFAULT 'M' AFTER `quantity`;
```

### Step 2: Check Cart Data
Run this SQL to see if existing carts have size data:

```sql
-- Check current cart data
SELECT id, product_id, quantity, size, user_id FROM carts;
```

If size column shows NULL or doesn't exist, the carts were created before the size feature was implemented.

### Step 3: Test with New Cart Items
1. **Clear existing cart items** (they won't have size data)
2. **Add new products to cart** with size selection
3. **Check cart data** in database to confirm size is stored
4. **Proceed with checkout** to test order creation

### Step 4: Check Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Add products to cart and checkout
4. Look for the debug messages:
   - "=== CHECKOUT DEBUG ==="
   - "Selected carts:" 
   - "Orders being sent:"
   - "Cart sizes:"

### Step 5: Check PHP Error Logs
Look for these debug messages in your PHP error log:
- "=== ORDER CREATION DEBUG ==="
- "Received orders data:"
- "Processing order - Product: ..., Size: ..."

## Quick Fix Commands

### Clear Old Cart Data (No Size)
```sql
-- Delete old cart items that don't have size data
DELETE FROM carts WHERE size IS NULL OR size = '';
```

### Check Recent Orders
```sql
-- Check if new orders have size data
SELECT id, customer, product, quantity, size, status FROM orders ORDER BY id DESC LIMIT 10;
```

## Expected Flow

1. **Add to Cart**: Product + Size → Cart (with size stored)
2. **View Cart**: Shows product with size information  
3. **Checkout**: Cart items → Orders (size transferred)
4. **Admin View**: Orders show size column

## Common Issues

### Issue 1: Database Columns Missing
**Solution**: Run the ALTER TABLE commands above

### Issue 2: Old Cart Items Without Size
**Solution**: Clear cart and add new items with size selection

### Issue 3: Size Not Passed from Frontend
**Solution**: Check console logs for "Orders being sent" - should show size field

### Issue 4: PHP Not Receiving Size Data
**Solution**: Check PHP error logs for "Received orders data" message

## Test Scenario

1. **Add product to cart** with size selection (should see size in cart view)
2. **Open browser console** (F12)
3. **Checkout the cart**
4. **Check console logs** for debug messages
5. **Check admin panel** to see if size appears in orders table
6. **Check database** directly: `SELECT * FROM orders ORDER BY id DESC LIMIT 5;`

## If Still Not Working

1. **Verify database schema**: Ensure `size` columns exist
2. **Clear old cart data**: Delete carts without size data  
3. **Test with fresh cart items**: Add new products with size
4. **Check debug logs**: Both browser console and PHP error logs
5. **Verify data flow**: Cart → Orders → Admin display
