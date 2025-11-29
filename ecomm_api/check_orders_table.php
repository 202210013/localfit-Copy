<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$mysqli = new mysqli("localhost", "root", "", "ecomm_db");

if ($mysqli->connect_errno) {
    echo json_encode(["error" => "Failed to connect to DB"]);
    exit();
}

// Check current table structure
echo "<h3>Current Orders Table Structure:</h3>";
$result = $mysqli->query("DESCRIBE orders");
echo "<table border='1'>";
echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
while ($row = $result->fetch_assoc()) {
    echo "<tr>";
    echo "<td>{$row['Field']}</td>";
    echo "<td>{$row['Type']}</td>";
    echo "<td>{$row['Null']}</td>";
    echo "<td>{$row['Key']}</td>";
    echo "<td>{$row['Default']}</td>";
    echo "<td>{$row['Extra']}</td>";
    echo "</tr>";
}
echo "</table>";

// Check if we have any timestamp columns
$result = $mysqli->query("SHOW COLUMNS FROM orders WHERE Type LIKE '%timestamp%' OR Type LIKE '%datetime%'");
$hasTimestamp = $result->num_rows > 0;

echo "<h3>Has Timestamp Columns: " . ($hasTimestamp ? "YES" : "NO") . "</h3>";

if ($hasTimestamp) {
    while ($row = $result->fetch_assoc()) {
        echo "<p>Timestamp field: {$row['Field']} ({$row['Type']})</p>";
    }
}

// Show sample order data
echo "<h3>Sample Order Data:</h3>";
$result = $mysqli->query("SELECT * FROM orders LIMIT 3");
while ($row = $result->fetch_assoc()) {
    echo "<pre>" . print_r($row, true) . "</pre>";
}

// If no timestamp column exists, add one
if (!$hasTimestamp) {
    echo "<h3>Adding timestamp column...</h3>";
    
    // Add created_at column with default current timestamp
    $alterQuery = "ALTER TABLE orders ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
    if ($mysqli->query($alterQuery)) {
        echo "<p style='color: green;'>✅ Successfully added created_at column!</p>";
        
        // Update existing orders to have current timestamp
        $updateQuery = "UPDATE orders SET created_at = NOW() WHERE created_at IS NULL";
        if ($mysqli->query($updateQuery)) {
            echo "<p style='color: green;'>✅ Updated existing orders with current timestamp!</p>";
        }
    } else {
        echo "<p style='color: red;'>❌ Failed to add created_at column: " . $mysqli->error . "</p>";
    }
}

$mysqli->close();
?>
