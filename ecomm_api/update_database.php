<?php
// Allow CORS
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

require_once 'config/database.php';

try {
    $database = new Connection();
    $db = $database->connect();
    
    echo "Connecting to database...\n";
    
    // Check if pickup_date column already exists
    $checkQuery = "SHOW COLUMNS FROM orders LIKE 'pickup_date'";
    $checkStmt = $db->query($checkQuery);
    $columnExists = $checkStmt->rowCount() > 0;
    
    if (!$columnExists) {
        // Add pickup_date column to orders table
        $sql1 = "ALTER TABLE orders ADD COLUMN pickup_date DATE NULL AFTER status";
        $db->exec($sql1);
        echo "✓ Added pickup_date column to orders table successfully\n";
    } else {
        echo "✓ pickup_date column already exists in orders table\n";
    }
    
    // Update existing orders with pickup_date (3 days from creation date for completed orders)
    $sql2 = "UPDATE orders 
             SET pickup_date = DATE_ADD(created_at, INTERVAL 3 DAY) 
             WHERE status IN ('approved', 'ready-for-pickup', 'completed') 
             AND pickup_date IS NULL";
    
    $stmt = $db->prepare($sql2);
    $stmt->execute();
    $affectedRows = $stmt->rowCount();
    
    echo "✓ Updated $affectedRows existing orders with pickup dates\n";
    
    $response = [
        "success" => true,
        "message" => "Database schema updated successfully!",
        "updated_orders" => $affectedRows,
        "column_added" => !$columnExists
    ];
    
    echo json_encode($response);
    
} catch (PDOException $e) {
    $error = [
        "success" => false,
        "error" => "Database error: " . $e->getMessage()
    ];
    echo json_encode($error);
    http_response_code(500);
}
?>
