# Rating System Implementation

## Overview
This rating system allows users to rate completed orders with a 5-star rating and optional text review. The implementation includes frontend UI, backend API, and database schema.

## Features
- **5-Star Rating System**: Users can rate orders from 1 to 5 stars
- **Optional Review Text**: Users can add written feedback
- **Interactive UI**: SweetAlert2 modal with clickable star selection
- **Duplicate Prevention**: One rating per order per user
- **Product Ratings**: View average ratings and distribution for products
- **Admin View**: Admins can view all ratings

## Database Schema

### Ratings Table
```sql
CREATE TABLE ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_order_user (order_id, user_id)
);
```

## Setup Instructions

### 1. Database Migration
Run the SQL migration to create the ratings table:
```bash
# Using MySQL command line
mysql -u root -p gpshitfit_db < setup_ratings_table.sql

# Or using phpMyAdmin
# - Open phpMyAdmin
# - Select your database (gpshitfit_db)
# - Go to SQL tab
# - Copy and paste contents of setup_ratings_table.sql
# - Click "Go"
```

### 2. Verify Installation
The ratings table should have these columns:
- `id` (Primary Key)
- `order_id` (Foreign Key to orders)
- `product_id` (Foreign Key to products)
- `user_id` (Foreign Key to users)
- `rating` (1-5 integer)
- `review` (Optional text)
- `created_at` (Timestamp)

## API Endpoints

### POST /api/ratings
Submit a new rating (requires authentication)
```json
{
  "orderId": 123,
  "productId": 45,
  "rating": 5,
  "review": "Great product!" (optional)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "ratingId": 1
}
```

### GET /api/ratings/product/:productId
Get all ratings for a specific product
```json
{
  "success": true,
  "ratings": [
    {
      "id": 1,
      "order_id": 123,
      "product_id": 45,
      "user_id": 10,
      "rating": 5,
      "review": "Great product!",
      "user_name": "John Doe",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### GET /api/ratings/order/:orderId
Get rating for a specific order
```json
{
  "success": true,
  "rating": {
    "id": 1,
    "rating": 5,
    "review": "Great product!",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### GET /api/ratings
Get all ratings (admin only, requires authentication)
```json
{
  "success": true,
  "ratings": [...]
}
```

### GET /api/ratings/summary/:productId
Get rating summary for a product
```json
{
  "success": true,
  "summary": {
    "product_id": 45,
    "product_name": "GPS HIT FIT T-Shirt",
    "total_ratings": 10,
    "average_rating": "4.5",
    "rating_distribution": {
      "5": 6,
      "4": 3,
      "3": 1,
      "2": 0,
      "1": 0
    }
  }
}
```

## Frontend Components

### Files Modified
1. **src/app/models/rating.model.ts** - Rating data models
2. **src/app/services/e-comm.service.ts** - API service methods
3. **src/app/orders/orders.component.ts** - Rating UI logic
4. **src/app/orders/orders.component.html** - Rating button
5. **src/app/orders/orders.component.css** - Rating styles

### User Interface

#### Rating Button
- Appears only on **completed orders**
- Gold star icon with "Rate Order" text
- Gold gradient background with hover effect

#### Rating Modal
- Opens when user clicks "Rate Order"
- Interactive 5-star selection:
  - Hover to preview rating
  - Click to select rating
  - Stars turn gold when selected
- Optional textarea for review
- Validation: Must select at least 1 star

### Usage Flow
1. User completes an order (status: completed)
2. "Rate Order" button appears on order card
3. Click button to open rating modal
4. Select 1-5 stars and optionally write review
5. Click "Submit" to save rating
6. Success message confirms rating saved
7. Button disabled/hidden after rating submitted

## Backend Implementation

### Files Created
1. **ecomm_nodejs/services/RatingService.js** - Rating business logic
2. **ecomm_nodejs/migrations/create_ratings_table.sql** - Database schema
3. **setup_ratings_table.sql** - Migration helper

### Files Modified
1. **ecomm_nodejs/Router.js** - Added rating routes

### Service Methods
- `submitRating(orderId, productId, userId, rating, review)` - Save new rating
- `getRatingsByProduct(productId)` - Get all product ratings
- `getRatingByOrder(orderId)` - Get order rating
- `getAllRatings()` - Admin: Get all ratings
- `getProductRatingSummary(productId)` - Get rating statistics

## Security Features

### Authentication
- Rating submission requires user authentication
- User ID extracted from JWT token
- Prevents unauthorized rating submissions

### Validation
- Rating must be 1-5 (enforced by database constraint)
- Order ID, Product ID, and rating are required
- Duplicate prevention: UNIQUE constraint on (order_id, user_id)

### Data Integrity
- Foreign keys link ratings to orders, products, and users
- Cascade delete: Ratings removed when order/product/user deleted
- Indexes for efficient queries

## Testing

### Manual Testing Checklist
- [ ] Complete an order (approve → ready for pickup → confirm pickup)
- [ ] Verify "Rate Order" button appears on completed orders tab
- [ ] Click button and verify modal opens
- [ ] Hover over stars and verify preview works
- [ ] Click stars and verify selection
- [ ] Submit without selecting stars (should show error)
- [ ] Submit with stars selected (should save)
- [ ] Try rating same order again (should show error)
- [ ] Verify rating appears in database

### Database Verification
```sql
-- Check ratings table
SELECT * FROM ratings;

-- Get product ratings
SELECT p.name, AVG(r.rating) as avg_rating, COUNT(r.id) as total_ratings
FROM products p
LEFT JOIN ratings r ON p.id = r.product_id
GROUP BY p.id;

-- Get user ratings
SELECT u.name, COUNT(r.id) as total_ratings_given
FROM users u
LEFT JOIN ratings r ON u.id = r.user_id
GROUP BY u.id;
```

## Future Enhancements

### Phase 2 (Optional)
1. **Display Ratings on Product Cards**
   - Show average rating with star icons
   - Display total number of ratings
   - "No ratings yet" for unrated products

2. **Admin Rating Management**
   - View all ratings in admin dashboard
   - Filter by product/user/rating
   - Option to hide inappropriate reviews

3. **Rating Analytics**
   - Top-rated products report
   - Rating trends over time
   - User engagement metrics

4. **Enhanced UI**
   - Half-star ratings (0.5 increments)
   - Rating breakdown chart
   - Recent reviews section
   - "Helpful" voting for reviews

## Troubleshooting

### Rating Button Not Showing
- Verify order status is 'completed'
- Check `activeTab === 'completed'`
- Ensure CSS loaded correctly

### Rating Submission Fails
- Check user authentication (JWT token valid)
- Verify product ID exists in database
- Check for duplicate rating (user already rated order)
- Review browser console and server logs

### Database Errors
- Ensure ratings table exists: `SHOW TABLES LIKE 'ratings';`
- Verify foreign keys reference correct tables
- Check user has INSERT permission

### API Errors
- Server running on port 3001?
- CORS enabled for frontend domain?
- Check network tab in browser DevTools

## Developer Notes

### Product ID Caching
Orders are enriched with product IDs during `loadOrders()`:
- `enrichOrdersWithPrices()` matches order.product (name) with products array
- Caches `matchingProduct.id` as `order.productId`
- Used by `getProductIdFromOrder()` when submitting rating

### SweetAlert2 Star Rating
Custom HTML template with Font Awesome icons:
```javascript
html: `
  <div class="star-rating">
    <i class="fa-regular fa-star" data-rating="1-5"></i>
  </div>
`
```
JavaScript handles:
- Click events to select rating
- Hover effects for preview
- Class toggling (fa-regular ↔ fa-solid)
- Color changes (gray → gold)

### Rating Service Architecture
- **Layer Separation**: Service handles business logic, Router handles HTTP
- **Error Handling**: Try-catch with detailed error messages
- **Reusability**: Methods can be called from multiple routes
- **Database Pooling**: Uses shared database connection pool

## Support

For issues or questions:
1. Check this README first
2. Review browser console for errors
3. Check Node.js server logs
4. Verify database connection
5. Test API endpoints with Postman/curl

## Version History

### v1.0.0 (2025-01-15)
- Initial rating system implementation
- 5-star rating with optional review
- Frontend UI with SweetAlert2
- Backend API with Node.js/Express
- MySQL database schema
- Authentication and validation
