# Rating System Troubleshooting Guide

## Quick Diagnostics

### Step 1: Check if Node.js server is running
Open browser console (F12) and check for errors when clicking "Rate Order"

### Step 2: Create the ratings table
Run this in MySQL (phpMyAdmin or command line):

```sql
USE gpshitfit_db;

CREATE TABLE IF NOT EXISTS ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_order_user (order_id, user_id),
  INDEX idx_product_id (product_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify table was created
SHOW TABLES LIKE 'ratings';
DESCRIBE ratings;
```

### Step 3: Restart Node.js server
```bash
cd ecomm_nodejs
node server.js
```

### Step 4: Test the system
Open: `http://localhost/localfit/test_rating_system.html`

This will test:
- Server connection
- Ratings table existence
- Rating submission
- Rating retrieval

## Common Issues and Solutions

### Issue 1: "Failed to submit rating"
**Symptoms:** Error message when clicking Submit Rating
**Cause:** Ratings table doesn't exist
**Solution:** Run the SQL script above to create the table

### Issue 2: "Server connection failed"
**Symptoms:** Network error in browser console
**Cause:** Node.js server not running
**Solution:** 
```bash
cd c:\xampp\htdocs\localfit\ecomm_nodejs
node server.js
```

### Issue 3: "Product ID is 0"
**Symptoms:** Rating submits but shows product_id: 0 in database
**Cause:** Product name mismatch between order and products table
**Solution:** 
1. Check browser console for "productId: 0" message
2. Verify order.product matches a product.name in database
3. Reload orders page to re-enrich with product data

### Issue 4: "Authentication required"
**Symptoms:** 401 error when submitting rating
**Cause:** Not logged in or token expired
**Solution:** 
1. Logout and login again
2. Check localStorage for 'auth_token'

### Issue 5: "Already rated this order"
**Symptoms:** Error message about duplicate rating
**Cause:** User already submitted a rating for this order
**Solution:** This is expected behavior - each user can only rate an order once

## Testing Checklist

- [ ] Database table exists (`SHOW TABLES LIKE 'ratings';`)
- [ ] Node.js server running (port 3001)
- [ ] User is logged in (check localStorage.auth_token)
- [ ] Order has productId cached (check browser console)
- [ ] Rating modal opens when clicking button
- [ ] Stars are clickable and turn gold
- [ ] Submit button works
- [ ] Success message appears
- [ ] Rating appears in database (`SELECT * FROM ratings;`)

## Browser Console Debugging

Open Developer Tools (F12) and check Console tab for:

```javascript
// Expected logs when rating:
"🌟 Rating order with stars"
"Selected rating: 5"
"Product ID: 123"  // Should NOT be 0
"✅ Rating submitted successfully"

// Error logs to look for:
"❌ Error submitting rating:"
"Product ID is 0" // Problem: no matching product
"Network error" // Problem: server not running
"401 Unauthorized" // Problem: not logged in
```

## Manual Database Check

```sql
-- Check if ratings table exists
USE gpshitfit_db;
SHOW TABLES LIKE 'ratings';

-- View all ratings
SELECT * FROM ratings;

-- Check rating with order details
SELECT 
    r.id,
    r.rating,
    r.review,
    o.id as order_id,
    o.product,
    u.name as user_name
FROM ratings r
JOIN orders o ON r.order_id = o.id
JOIN users u ON r.user_id = u.id;

-- Check if foreign keys are valid
SELECT 
    (SELECT COUNT(*) FROM ratings WHERE order_id NOT IN (SELECT id FROM orders)) as invalid_orders,
    (SELECT COUNT(*) FROM ratings WHERE product_id NOT IN (SELECT id FROM products)) as invalid_products,
    (SELECT COUNT(*) FROM ratings WHERE user_id NOT IN (SELECT id FROM users)) as invalid_users;
```

## API Endpoint Testing (Using curl or Postman)

### Test 1: Submit Rating
```bash
curl -X POST http://localhost:3001/api/ratings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"orderId": 1, "productId": 1, "rating": 5, "review": "Test"}'
```

### Test 2: Get Product Ratings
```bash
curl http://localhost:3001/api/ratings/product/1
```

### Test 3: Get Order Rating
```bash
curl http://localhost:3001/api/ratings/order/1
```

### Test 4: Get Rating Summary
```bash
curl http://localhost:3001/api/ratings/summary/1
```

## Server Logs to Check

When Node.js server is running, you should see:
```
Server running on port 3001
Rating routes loaded
POST /api/ratings endpoint available
```

When rating is submitted, check for:
```
POST /api/ratings
Body: { orderId: 1, productId: 1, rating: 5, review: "..." }
✅ Rating saved with ID: 1
```

## Next Steps After Fixing

1. **Test rating submission** with a completed order
2. **Verify in database** (`SELECT * FROM ratings;`)
3. **Try rating same order again** (should show error)
4. **View rating summary** for a product
5. **Admin view** of all ratings

## Still Not Working?

1. Open `test_rating_system.html` in browser
2. Click each test button
3. Note which tests fail
4. Check the specific error messages
5. Refer to the error-specific solutions above

## Contact Info
Check RATING_SYSTEM_README.md for full documentation
