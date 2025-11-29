<!DOCTYPE html>
<html>
<head>
    <title>Database Migration - Add starting_size_quantities</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .success { color: #4caf50; padding: 10px; background: #e8f5e9; border-radius: 5px; margin: 10px 0; }
        .error { color: #f44336; padding: 10px; background: #ffebee; border-radius: 5px; margin: 10px 0; }
        .info { color: #2196f3; padding: 10px; background: #e3f2fd; border-radius: 5px; margin: 10px 0; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Database Migration</h1>
        <h2>Adding starting_size_quantities column to products table</h2>

<?php
require_once(__DIR__ . '/../config/database.php');

try {
    $db = (new Connection())->connect();
    
    echo '<div class="info">📋 Checking database structure...</div>';
    
    // Check if column already exists
    $checkQuery = "SHOW COLUMNS FROM products LIKE 'starting_size_quantities'";
    $stmt = $db->prepare($checkQuery);
    $stmt->execute();
    
    if ($stmt->rowCount() > 0) {
        echo '<div class="success">✓ Column "starting_size_quantities" already exists. No migration needed.</div>';
    } else {
        echo '<div class="info">➤ Column does not exist. Adding now...</div>';
        
        // Add the column
        $addColumnQuery = "ALTER TABLE products 
                           ADD COLUMN starting_size_quantities JSON NULL AFTER size_quantities";
        $db->exec($addColumnQuery);
        echo '<div class="success">✓ Successfully added starting_size_quantities column</div>';
        
        // Update existing products
        $updateQuery = "UPDATE products 
                        SET starting_size_quantities = size_quantities 
                        WHERE size_quantities IS NOT NULL AND size_quantities != 'null'";
        $result = $db->exec($updateQuery);
        echo '<div class="success">✓ Updated ' . $result . ' existing products with starting quantities</div>';
    }
    
    // Verify the column exists now
    echo '<div class="info">🔍 Verifying column structure...</div>';
    $verifyQuery = "SHOW COLUMNS FROM products LIKE 'starting_size_quantities'";
    $stmt = $db->prepare($verifyQuery);
    $stmt->execute();
    $column = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($column) {
        echo '<div class="success">✓ Column verified successfully!</div>';
        echo '<pre>';
        print_r($column);
        echo '</pre>';
    }
    
    echo '<div class="success"><strong>✅ Migration completed successfully!</strong></div>';
    echo '<div class="info">You can now close this page and refresh your inventory management.</div>';
    
} catch (PDOException $e) {
    echo '<div class="error">❌ Migration failed: ' . htmlspecialchars($e->getMessage()) . '</div>';
    echo '<div class="error">Please check your database connection and permissions.</div>';
}
?>
    </div>
</body>
</html>
