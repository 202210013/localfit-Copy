<?php
require_once(__DIR__ . '/../config/database.php');

try {
    // Database connection
    $connection = new Connection();
    $db = $connection->connect();
    
    echo "Starting migration: Add available_sizes to products table...\n";
    
    // Read SQL file
    $sql = file_get_contents(__DIR__ . '/add_available_sizes_to_products.sql');
    
    if ($sql === false) {
        throw new Exception("Could not read SQL file");
    }
    
    // Split SQL statements by semicolon
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    
    foreach ($statements as $statement) {
        if (!empty($statement)) {
            echo "Executing: " . substr($statement, 0, 50) . "...\n";
            $db->exec($statement);
        }
    }
    
    echo "Migration completed successfully!\n";
    
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
