<?php
require_once 'config/database.php';

try {
    $database = new Connection();
    $db = $database->connect();
    
    // Add pickup_date column to orders table
    $sql1 = "ALTER TABLE orders ADD COLUMN pickup_date DATE NULL AFTER status";
    
    try {
        $db->exec($sql1);
        echo "✓ Added pickup_date column to orders table successfully\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "✓ pickup_date column already exists in orders table\n";
        } else {
            throw $e;
        }
    }
    
    // Update existing orders with pickup_date (3 days from creation date)
    $sql2 = "UPDATE orders 
             SET pickup_date = DATE_ADD(created_at, INTERVAL 3 DAY) 
             WHERE status IN ('approved', 'ready-for-pickup', 'completed') 
             AND pickup_date IS NULL";
    
    $stmt = $db->prepare($sql2);
    $stmt->execute();
    $affectedRows = $stmt->rowCount();
    
    echo "✓ Updated $affectedRows existing orders with pickup dates\n";
    echo "Database schema updated successfully!\n";
    
} catch (PDOException $e) {
    echo "Error updating database: " . $e->getMessage() . "\n";
    exit(1);
}
?>
