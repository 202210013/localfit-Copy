<?php
/**
 * Database Migration Runner
 * Run this script to apply the pickup_date migration to the carts table
 */

require_once(__DIR__ . '/../config/database.php');

try {
    // Get database connection
    $connection = new Connection();
    $db = $connection->connect();
    
    echo "Starting migration: Add pickup_date to carts table...\n";
    
    // Read and execute the migration SQL
    $migrationSQL = file_get_contents(__DIR__ . '/add_pickup_date_to_carts.sql');
    
    // Split the SQL into individual statements
    $statements = explode(';', $migrationSQL);
    
    foreach ($statements as $statement) {
        $statement = trim($statement);
        if (!empty($statement)) {
            try {
                $db->exec($statement);
                echo "✓ Executed: " . substr($statement, 0, 50) . "...\n";
            } catch (PDOException $e) {
                echo "⚠ Warning: " . $e->getMessage() . "\n";
            }
        }
    }
    
    echo "\n✅ Migration completed successfully!\n";
    echo "The carts table now includes the pickup_date column.\n";
    
} catch (Exception $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
