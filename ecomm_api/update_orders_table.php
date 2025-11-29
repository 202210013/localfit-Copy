<?php
// PHP Script to add created_at column to orders table
// Run this by visiting: http://localhost/E-comms/ecomm/e-comm/ecomm_api/update_orders_table.php

header('Content-Type: text/html; charset=utf-8');
echo "<h2>🔧 Orders Table Update Script</h2>";

// Database connection
$mysqli = new mysqli("localhost", "root", "", "ecomm_db");

if ($mysqli->connect_errno) {
    echo "<p style='color: red;'>❌ Failed to connect to database: " . $mysqli->connect_error . "</p>";
    exit();
}

echo "<p style='color: green;'>✅ Connected to database successfully!</p>";

// Check if created_at column already exists
$result = $mysqli->query("SHOW COLUMNS FROM orders LIKE 'created_at'");
$columnExists = $result->num_rows > 0;

if ($columnExists) {
    echo "<p style='color: orange;'>⚠️ The 'created_at' column already exists in the orders table.</p>";
} else {
    echo "<p>➕ Adding 'created_at' column to orders table...</p>";
    
    // Add the created_at column
    $alterQuery = "ALTER TABLE `orders` ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
    if ($mysqli->query($alterQuery)) {
        echo "<p style='color: green;'>✅ Successfully added 'created_at' column!</p>";
        
        // Update existing orders with realistic timestamps
        echo "<p>📅 Updating existing orders with timestamps...</p>";
        
        // Get all existing orders
        $ordersResult = $mysqli->query("SELECT id FROM orders ORDER BY id");
        $orders = [];
        while ($row = $ordersResult->fetch_assoc()) {
            $orders[] = $row['id'];
        }
        
        // Update each order with a different timestamp spread over the last 30 days
        $totalOrders = count($orders);
        foreach ($orders as $index => $orderId) {
            // Spread orders over the last 30 days, with newer orders having higher IDs
            $daysAgo = 30 - (($index / $totalOrders) * 30);
            $hoursRandom = rand(8, 20); // Random hour between 8 AM and 8 PM
            $minutesRandom = rand(0, 59); // Random minutes
            
            $timestamp = date('Y-m-d H:i:s', strtotime("-{$daysAgo} days {$hoursRandom}:{$minutesRandom}:00"));
            
            $updateQuery = "UPDATE orders SET created_at = '$timestamp' WHERE id = $orderId";
            $mysqli->query($updateQuery);
        }
        
        echo "<p style='color: green;'>✅ Updated " . count($orders) . " existing orders with timestamps!</p>";
        
    } else {
        echo "<p style='color: red;'>❌ Failed to add 'created_at' column: " . $mysqli->error . "</p>";
    }
}

// Show current table structure
echo "<h3>📋 Current Orders Table Structure:</h3>";
$result = $mysqli->query("DESCRIBE orders");
echo "<table border='1' style='border-collapse: collapse; margin: 10px 0;'>";
echo "<tr style='background-color: #f0f0f0;'><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
while ($row = $result->fetch_assoc()) {
    echo "<tr>";
    echo "<td style='padding: 5px;'>{$row['Field']}</td>";
    echo "<td style='padding: 5px;'>{$row['Type']}</td>";
    echo "<td style='padding: 5px;'>{$row['Null']}</td>";
    echo "<td style='padding: 5px;'>{$row['Key']}</td>";
    echo "<td style='padding: 5px;'>{$row['Default']}</td>";
    echo "<td style='padding: 5px;'>{$row['Extra']}</td>";
    echo "</tr>";
}
echo "</table>";

// Show sample completed orders with timestamps
echo "<h3>📊 Sample Completed Orders with Timestamps:</h3>";
$result = $mysqli->query("SELECT id, customer, product, status, created_at FROM orders WHERE status = 'completed' ORDER BY created_at DESC LIMIT 10");

if ($result->num_rows > 0) {
    echo "<table border='1' style='border-collapse: collapse; margin: 10px 0;'>";
    echo "<tr style='background-color: #f0f0f0;'><th>ID</th><th>Customer</th><th>Product</th><th>Status</th><th>Created At</th></tr>";
    while ($row = $result->fetch_assoc()) {
        echo "<tr>";
        echo "<td style='padding: 5px;'>{$row['id']}</td>";
        echo "<td style='padding: 5px;'>{$row['customer']}</td>";
        echo "<td style='padding: 5px; max-width: 200px; overflow: hidden;'>" . substr($row['product'], 0, 30) . "...</td>";
        echo "<td style='padding: 5px;'>{$row['status']}</td>";
        echo "<td style='padding: 5px;'>{$row['created_at']}</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "<p>No completed orders found.</p>";
}

$mysqli->close();

echo "<h3>🎉 Database Update Complete!</h3>";
echo "<p>You can now refresh your admin dashboard to see the dates in the 'Date of Purchase' column.</p>";
echo "<p><a href='http://localhost:4200/admin' target='_blank'>➡️ Go to Admin Dashboard</a></p>";
?>
