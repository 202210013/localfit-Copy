<?php
// Allow CORS and prevent any output buffering issues
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

// Prevent any PHP warnings from breaking JSON
ini_set('display_errors', 0);
error_reporting(0);

require_once 'config/database.php';

try {
    $database = new Connection();
    $db = $database->connect();
    
    echo "Connecting to database...\n";
    
    // Use a more reliable method to check for column existence
    $checkQuery = "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'orders' 
                   AND COLUMN_NAME = 'remarks'";
    
    $result = $db->query($checkQuery)->fetch(PDO::FETCH_ASSOC);
    $columnExists = $result['count'] > 0;
    
    echo "Column exists check: " . ($columnExists ? "YES" : "NO") . "\n";
    
    if (!$columnExists) {
        // Add remarks column to orders table
        $sql1 = "ALTER TABLE orders ADD COLUMN remarks TEXT NULL AFTER status";
        $db->exec($sql1);
        echo "✓ Added remarks column to orders table successfully\n";
        $columnAdded = true;
    } else {
        echo "✓ remarks column already exists in orders table\n";
        $columnAdded = false;
    }
    
    // Verify the column was added
    $verifyResult = $db->query($checkQuery)->fetch(PDO::FETCH_ASSOC);
    $finalExists = $verifyResult['count'] > 0;
    
    $response = [
        "success" => true,
        "message" => "Database schema updated successfully!",
        "column_added" => $columnAdded,
        "column_exists_after" => $finalExists
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
