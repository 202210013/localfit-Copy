<?php
/**
 * Migration: Add starting_size_quantities column to products table
 * This allows tracking of initial stock quantities for inventory management
 */

require_once(__DIR__ . '/../config/database.php');

try {
    $db = (new Connection())->connect();
    
    echo "Starting migration: Add starting_size_quantities column...\n";
    
    // Check if column already exists
    $checkQuery = "SHOW COLUMNS FROM products LIKE 'starting_size_quantities'";
    $stmt = $db->prepare($checkQuery);
    $stmt->execute();
    
    if ($stmt->rowCount() > 0) {
        echo "Column 'starting_size_quantities' already exists. Skipping...\n";
        exit(0);
    }
    
    // Add the column
    $addColumnQuery = "ALTER TABLE products 
                       ADD COLUMN starting_size_quantities JSON NULL AFTER size_quantities";
    $db->exec($addColumnQuery);
    echo "✓ Added starting_size_quantities column\n";
    
    // Update existing products to set starting_size_quantities equal to current size_quantities
    $updateQuery = "UPDATE products 
                    SET starting_size_quantities = size_quantities 
                    WHERE size_quantities IS NOT NULL";
    $result = $db->exec($updateQuery);
    echo "✓ Updated $result existing products with starting quantities\n";
    
    echo "\nMigration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
