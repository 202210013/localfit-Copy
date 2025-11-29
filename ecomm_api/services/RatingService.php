<?php

class RatingService {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // Submit a new rating
    public function submitRating($orderId, $productId, $userId, $rating, $review = null) {
        try {
            // Validate rating value (1-5)
            if ($rating < 1 || $rating > 5) {
                return json_encode([
                    'success' => false,
                    'error' => 'Rating must be between 1 and 5'
                ]);
            }

            // Check if rating already exists for this order
            $checkQuery = "SELECT id FROM ratings WHERE order_id = :order_id AND user_id = :user_id";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->bindParam(':order_id', $orderId);
            $checkStmt->bindParam(':user_id', $userId);
            $checkStmt->execute();

            if ($checkStmt->fetch()) {
                return json_encode([
                    'success' => false,
                    'error' => 'You have already rated this order'
                ]);
            }

            // Insert the rating
            $query = "INSERT INTO ratings (order_id, product_id, user_id, rating, review, created_at) 
                      VALUES (:order_id, :product_id, :user_id, :rating, :review, NOW())";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':order_id', $orderId);
            $stmt->bindParam(':product_id', $productId);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':rating', $rating);
            $stmt->bindParam(':review', $review);
            $stmt->execute();

            return json_encode([
                'success' => true,
                'message' => 'Rating submitted successfully',
                'ratingId' => $this->db->lastInsertId()
            ]);
        } catch (Exception $e) {
            error_log('Error submitting rating: ' . $e->getMessage());
            return json_encode([
                'success' => false,
                'error' => 'Failed to submit rating'
            ]);
        }
    }

    // Get ratings for a specific product
    public function getRatingsByProduct($productId) {
        try {
            $query = "SELECT r.*, u.name as user_name, u.email as user_email 
                      FROM ratings r 
                      LEFT JOIN users u ON r.user_id = u.id 
                      WHERE r.product_id = :product_id 
                      ORDER BY r.created_at DESC";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':product_id', $productId);
            $stmt->execute();

            $ratings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                'success' => true,
                'ratings' => $ratings
            ]);
        } catch (Exception $e) {
            error_log('Error fetching ratings by product: ' . $e->getMessage());
            return json_encode([
                'success' => false,
                'error' => 'Failed to fetch ratings'
            ]);
        }
    }

    // Get rating for a specific order
    public function getRatingByOrder($orderId) {
        try {
            $query = "SELECT r.*, u.name as user_name, u.email as user_email 
                      FROM ratings r 
                      LEFT JOIN users u ON r.user_id = u.id 
                      WHERE r.order_id = :order_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':order_id', $orderId);
            $stmt->execute();

            $rating = $stmt->fetch(PDO::FETCH_ASSOC);

            return json_encode([
                'success' => true,
                'rating' => $rating ?: null
            ]);
        } catch (Exception $e) {
            error_log('Error fetching rating by order: ' . $e->getMessage());
            return json_encode([
                'success' => false,
                'error' => 'Failed to fetch rating'
            ]);
        }
    }

    // Get all ratings (admin view)
    public function getAllRatings() {
        try {
            $query = "SELECT r.*, u.name as user_name, u.email as user_email, 
                             p.name as product_name 
                      FROM ratings r 
                      LEFT JOIN users u ON r.user_id = u.id 
                      LEFT JOIN products p ON r.product_id = p.id 
                      ORDER BY r.created_at DESC";
            $stmt = $this->db->prepare($query);
            $stmt->execute();

            $ratings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                'success' => true,
                'ratings' => $ratings
            ]);
        } catch (Exception $e) {
            error_log('Error fetching all ratings: ' . $e->getMessage());
            return json_encode([
                'success' => false,
                'error' => 'Failed to fetch ratings'
            ]);
        }
    }

    // Get rating summary for a product (average, count)
    public function getProductRatingSummary($productId) {
        try {
            $query = "SELECT 
                        COUNT(*) as total_ratings,
                        AVG(rating) as average_rating,
                        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
                        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
                        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
                        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
                        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
                      FROM ratings 
                      WHERE product_id = :product_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':product_id', $productId);
            $stmt->execute();

            $summary = $stmt->fetch(PDO::FETCH_ASSOC);

            // Get product name
            $productQuery = "SELECT id, name FROM products WHERE id = :product_id";
            $productStmt = $this->db->prepare($productQuery);
            $productStmt->bindParam(':product_id', $productId);
            $productStmt->execute();
            $product = $productStmt->fetch(PDO::FETCH_ASSOC);

            return json_encode([
                'success' => true,
                'summary' => [
                    'product_id' => $productId,
                    'product_name' => $product ? $product['name'] : 'Unknown',
                    'total_ratings' => $summary['total_ratings'] ?: 0,
                    'average_rating' => $summary['average_rating'] ? number_format($summary['average_rating'], 1) : 0,
                    'rating_distribution' => [
                        '5' => $summary['five_star'] ?: 0,
                        '4' => $summary['four_star'] ?: 0,
                        '3' => $summary['three_star'] ?: 0,
                        '2' => $summary['two_star'] ?: 0,
                        '1' => $summary['one_star'] ?: 0
                    ]
                ]
            ]);
        } catch (Exception $e) {
            error_log('Error fetching rating summary: ' . $e->getMessage());
            return json_encode([
                'success' => false,
                'error' => 'Failed to fetch rating summary'
            ]);
        }
    }
}
