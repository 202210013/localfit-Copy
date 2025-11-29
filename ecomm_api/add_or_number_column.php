<?php
// Add OR Number column to orders table
require_once 'config/database.php';

try {
    $database = new Connection();
    $db = $database->connect();
    
    echo "Connecting to database...\n";
    
    // Check if or_number column already exists
    $checkQuery = "SHOW COLUMNS FROM orders LIKE 'or_number'";
    $checkStmt = $db->query($checkQuery);
    $columnExists = $checkStmt->rowCount() > 0;
    
    if (!$columnExists) {
        // Add or_number column to orders table
        $sql1 = "ALTER TABLE orders ADD COLUMN or_number VARCHAR(50) NULL AFTER pickup_date";
        $db->exec($sql1);
        echo "✓ Added or_number column to orders table successfully\n";
    } else {
        echo "✓ or_number column already exists in orders table\n";
    }
    
    // Add index for better performance
    $indexQuery = "SHOW INDEX FROM orders WHERE Key_name = 'idx_or_number'";
    $indexStmt = $db->query($indexQuery);
    $indexExists = $indexStmt->rowCount() > 0;
    
    if (!$indexExists) {
        $sql2 = "ALTER TABLE orders ADD INDEX idx_or_number (or_number)";
        $db->exec($sql2);
        echo "✓ Added index for or_number column\n";
    } else {
        echo "✓ Index for or_number already exists\n";
    }
    
    $response = [
        "success" => true,
        "message" => "OR Number column added successfully!",
        "column_added" => !$columnExists,
        "index_added" => !$indexExists
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
