<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/config/database.php';

try {
    $db = (new Connection())->connect();
    
    echo "Checking orders table structure...\n";
    
    // Get table structure
    $stmt = $db->query("DESCRIBE orders");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Current table structure:\n";
    foreach ($columns as $column) {
        echo "- {$column['Field']} ({$column['Type']}) {$column['Null']} {$column['Key']} {$column['Default']}\n";
    }
    
    // Check if remarks column exists
    $remarksExists = false;
    foreach ($columns as $column) {
        if ($column['Field'] === 'remarks') {
            $remarksExists = true;
            break;
        }
    }
    
    echo "\nRemarks column exists: " . ($remarksExists ? "YES" : "NO") . "\n";
    
    // If it doesn't exist, try to add it
    if (!$remarksExists) {
        echo "Adding remarks column...\n";
        $db->exec("ALTER TABLE orders ADD COLUMN remarks TEXT NULL AFTER status");
        echo "Remarks column added successfully!\n";
    }
    
    echo "\nDatabase check completed.";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
