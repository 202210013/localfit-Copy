<?php
class OrderService {
    private $db;
    public function __construct($db) { $this->db = $db; }
    
    // Helper method to deduct product quantity for a specific size
    private function deductProductQuantity($productName, $size, $quantity) {
        // Get the product's current size_quantities
        $productStmt = $this->db->prepare("SELECT size_quantities FROM products WHERE name = ?");
        $productStmt->execute([$productName]);
        $product = $productStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($product && !empty($product['size_quantities'])) {
            $sizeQuantities = json_decode($product['size_quantities'], true);
            
            // Reduce the quantity for the ordered size
            if (isset($sizeQuantities[$size])) {
                $sizeQuantities[$size] = max(0, $sizeQuantities[$size] - $quantity);
                
                error_log("Deducted {$quantity} from {$productName} size {$size}: new quantity {$sizeQuantities[$size]}");
                
                // Calculate the new total quantity (sum of all sizes)
                $totalQuantity = array_sum($sizeQuantities);
                
                // Update the product with new quantities AND total quantity
                $updateStmt = $this->db->prepare("UPDATE products SET size_quantities = ?, quantity = ? WHERE name = ?");
                $updateStmt->execute([
                    json_encode($sizeQuantities),
                    $totalQuantity,
                    $productName
                ]);
            }
        }
    }
    
    // Helper method to restore product quantity for a specific size
    private function restoreProductQuantity($productName, $size, $quantity) {
        // Get the product's current size_quantities
        $productStmt = $this->db->prepare("SELECT size_quantities FROM products WHERE name = ?");
        $productStmt->execute([$productName]);
        $product = $productStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($product && !empty($product['size_quantities'])) {
            $sizeQuantities = json_decode($product['size_quantities'], true);
            
            // Add back the quantity for the ordered size
            if (isset($sizeQuantities[$size])) {
                $sizeQuantities[$size] += $quantity;
                
                error_log("Restored {$quantity} to {$productName} size {$size}: new quantity {$sizeQuantities[$size]}");
                
                // Calculate the new total quantity (sum of all sizes)
                $totalQuantity = array_sum($sizeQuantities);
                
                // Update the product with new quantities AND total quantity
                $updateStmt = $this->db->prepare("UPDATE products SET size_quantities = ?, quantity = ? WHERE name = ?");
                $updateStmt->execute([
                    json_encode($sizeQuantities),
                    $totalQuantity,
                    $productName
                ]);
            }
        }
    }
    
    public function createOrders($orders) {
    // Debug logging
    error_log("=== ORDER CREATION DEBUG ===");
    error_log("Received orders data: " . print_r($orders, true));
    
    $stmt = $this->db->prepare("INSERT INTO orders (customer, product, quantity, size, status, created_at, pickup_date) VALUES (?, ?, ?, ?, ?, NOW(), ?)");
    
    foreach ($orders as $order) {
        $size = $order['size'] ?? 'M';
        $pickupDate = $order['pickup_date'] ?? null;
        
        // Determine order status based on pickup date
        // If no pickup date, it's a production order for out-of-stock items
        $orderStatus = $pickupDate ? 'pending' : 'pending-production';
        
        error_log("Processing order - Product: {$order['product']}, Size: {$size}, Pickup Date: " . ($pickupDate ?: 'NULL') . ", Status: {$orderStatus}");
        
        // Insert the order
        $stmt->execute([
            $order['customer'],
            $order['product'],
            $order['quantity'],
            $size,
            $orderStatus,
            $pickupDate
        ]);
        
        // Quantity will be deducted when order status changes to 'ready-for-pickup'
        error_log("Order created with status {$orderStatus} - quantity will be deducted when ready for pickup");
    }
    
    $stmt = null; // Close statement
    // Always return valid JSON
    return json_encode(["success" => true]);
}
public function getAllOrders() {
    $user = $_GET['user'] ?? '';
    if ($user) {
        $stmt = $this->db->prepare("
            SELECT o.*, u.name as customer_name, u.cellphone as customer_cellphone 
            FROM orders o 
            LEFT JOIN users u ON o.customer = u.email 
            WHERE o.customer = ?
        ");
        $stmt->execute([$user]);
    } else {
        $stmt = $this->db->query("
            SELECT o.*, u.name as customer_name, u.cellphone as customer_cellphone 
            FROM orders o 
            LEFT JOIN users u ON o.customer = u.email
        ");
    }
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return $orders ?: []; // Always return an array
}
public function approveOrder($orderId) {
    // Get order details before updating status
    $orderStmt = $this->db->prepare("SELECT product, size, quantity, status FROM orders WHERE id = ?");
    $orderStmt->execute([$orderId]);
    $order = $orderStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        return json_encode(["success" => false, "error" => "Order not found"]);
    }
    
    // Check if order already has a pickup date from customer selection
    $checkStmt = $this->db->prepare("SELECT pickup_date FROM orders WHERE id = ?");
    $checkStmt->execute([$orderId]);
    $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    // Only set pickup date if customer didn't select one (fallback to 3 days from now)
    $pickupDate = $result['pickup_date'] ?: date('Y-m-d', strtotime('+3 days'));
    
    // Update order to ready-for-pickup status with pickup date
    $stmt = $this->db->prepare("UPDATE orders SET status = 'ready-for-pickup', pickup_date = ? WHERE id = ?");
    $stmt->execute([$pickupDate, $orderId]);
    
    // Deduct quantity now that order is ready for pickup
    $this->deductProductQuantity($order['product'], $order['size'], $order['quantity']);
    
    error_log("Order {$orderId} approved and quantity deducted for {$order['product']} size {$order['size']}");
    
    return json_encode(["success" => true, "pickup_date" => $pickupDate]);
}
public function declineOrder($orderId, $remarks = null) {
    try {
        error_log("=== DECLINE ORDER DEBUG ===");
        error_log("OrderID: $orderId");
        error_log("Remarks: " . ($remarks ?: "NULL"));
        
        // Get order details BEFORE declining to check if we need to restore quantity
        $orderStmt = $this->db->prepare("SELECT product, size, quantity, status FROM orders WHERE id = ?");
        $orderStmt->execute([$orderId]);
        $order = $orderStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            return json_encode(["success" => false, "error" => "Order not found"]);
        }
        
        $shouldRestoreQuantity = ($order['status'] === 'ready-for-pickup');
        
        // Try the modern approach first (with remarks)
        if ($remarks) {
            try {
                $stmt = $this->db->prepare("UPDATE orders SET status = 'declined', remarks = ? WHERE id = ?");
                $stmt->execute([$remarks, $orderId]);
                error_log("Order declined successfully with remarks");
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'Unknown column') !== false && strpos($e->getMessage(), 'remarks') !== false) {
                    error_log("Remarks column doesn't exist, adding it...");
                    // Try to add the column
                    try {
                        $this->db->exec("ALTER TABLE orders ADD COLUMN remarks TEXT NULL AFTER status");
                        error_log("Remarks column added successfully");
                        
                        // Retry the update
                        $stmt = $this->db->prepare("UPDATE orders SET status = 'declined', remarks = ? WHERE id = ?");
                        $stmt->execute([$remarks, $orderId]);
                        error_log("Order declined successfully with remarks after adding column");
                    } catch (PDOException $e2) {
                        error_log("Failed to add remarks column: " . $e2->getMessage());
                        // Fall back to basic decline without remarks
                        $stmt = $this->db->prepare("UPDATE orders SET status = 'declined' WHERE id = ?");
                        $stmt->execute([$orderId]);
                        error_log("Order declined without remarks (fallback)");
                    }
                } else {
                    throw $e; // Re-throw if it's a different error
                }
            }
        } else {
            // No remarks, simple update
            $stmt = $this->db->prepare("UPDATE orders SET status = 'declined' WHERE id = ?");
            $stmt->execute([$orderId]);
            error_log("Order declined successfully without remarks");
        }
        
        // Restore quantity if order was at ready-for-pickup status
        if ($shouldRestoreQuantity) {
            $this->restoreProductQuantity($order['product'], $order['size'], $order['quantity']);
            error_log("Restored {$order['quantity']} units to {$order['product']} size {$order['size']} after declining order {$orderId}");
        }
        
        return json_encode(["success" => true]);
        
    } catch (Exception $e) {
        error_log("Error declining order: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        return json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

public function markReadyForPickup($orderId) {
    // Get order details before updating status
    $orderStmt = $this->db->prepare("SELECT product, size, quantity, status FROM orders WHERE id = ?");
    $orderStmt->execute([$orderId]);
    $order = $orderStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        return json_encode(["success" => false, "error" => "Order not found"]);
    }
    
    // Update order status
    $stmt = $this->db->prepare("UPDATE orders SET status = 'ready-for-pickup' WHERE id = ?");
    $stmt->execute([$orderId]);
    
    // Deduct quantity now that order is ready for pickup
    $this->deductProductQuantity($order['product'], $order['size'], $order['quantity']);
    
    error_log("Order {$orderId} marked ready for pickup and quantity deducted for {$order['product']} size {$order['size']}");
    
    return json_encode(["success" => true]);
}

public function confirmPickup($orderId, $customerEmail, $orNumber = null) {
    // Debug logging
    error_log("=== CONFIRM PICKUP DEBUG ===");
    error_log("OrderID: $orderId");
    error_log("Customer Email: $customerEmail");
    error_log("OR Number: " . ($orNumber ?: "NULL"));
    
    // First check if order exists at all
    $checkStmt = $this->db->prepare("SELECT * FROM orders WHERE id = ?");
    $checkStmt->execute([$orderId]);
    $existingOrder = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existingOrder) {
        error_log("Order $orderId does not exist at all");
        http_response_code(404);
        return json_encode(["success" => false, "error" => "Order not found"]);
    }
    
    error_log("Order exists: " . print_r($existingOrder, true));
    
    // Check if it belongs to the customer
    if ($existingOrder['customer'] !== $customerEmail) {
        error_log("Order belongs to different customer: {$existingOrder['customer']} vs $customerEmail");
        http_response_code(403);
        return json_encode(["success" => false, "error" => "Order does not belong to this customer"]);
    }
    
    // Check the current status
    if ($existingOrder['status'] !== 'ready-for-pickup') {
        error_log("Order status is {$existingOrder['status']}, not ready-for-pickup");
        http_response_code(400);
        return json_encode([
            "success" => false, 
            "error" => "Order is not ready for pickup", 
            "current_status" => $existingOrder['status']
        ]);
    }
    
    // If we get here, the order is valid and ready for pickup
    error_log("Order is valid and ready for pickup, updating status to completed with OR Number");
    
    // Update order status to completed with OR Number
    $updateStmt = $this->db->prepare("UPDATE orders SET status = 'completed', or_number = ? WHERE id = ?");
    $updateStmt->execute([$orNumber, $orderId]);
    
    error_log("Order $orderId status updated to completed with OR Number: " . ($orNumber ?: "NULL"));
    return json_encode([
        "success" => true, 
        "message" => "Order pickup confirmed successfully",
        "or_number" => $orNumber
    ]);
}

public function updateCompletionRemarks($orderId, $remarks, $size = null) {
    // Debug logging
    error_log("=== UPDATE COMPLETION REMARKS DEBUG ===");
    error_log("OrderID: $orderId");
    error_log("Remarks: $remarks");
    error_log("Size: " . ($size ?: 'not provided'));
    error_log("Size type: " . gettype($size));
    
    if (!$orderId) {
        http_response_code(400);
        return json_encode(["success" => false, "error" => "Order ID is required"]);
    }
    
    // Check if order exists and is completed
    $checkStmt = $this->db->prepare("SELECT status, size as current_size FROM orders WHERE id = ?");
    $checkStmt->execute([$orderId]);
    $order = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        error_log("Order $orderId does not exist");
        http_response_code(404);
        return json_encode(["success" => false, "error" => "Order not found"]);
    }
    
    if ($order['status'] !== 'completed') {
        error_log("Order $orderId is not completed, current status: {$order['status']}");
        http_response_code(400);
        return json_encode([
            "success" => false, 
            "error" => "Only completed orders can have completion remarks"
        ]);
    }
    
    error_log("Current size in DB: " . $order['current_size']);
    error_log("New size to set: $size");
    
    // Update completion remarks and/or size
    if ($size && trim($size) !== '') {
        $updateStmt = $this->db->prepare("UPDATE orders SET completion_remarks = ?, size = ? WHERE id = ?");
        $params = [$remarks ?: '', $size, $orderId];
        error_log("Executing SQL with params: " . json_encode($params));
        $updateResult = $updateStmt->execute($params);
        error_log("✅ Order $orderId completion remarks and size updated successfully to: $size");
    } else {
        $updateStmt = $this->db->prepare("UPDATE orders SET completion_remarks = ? WHERE id = ?");
        $updateResult = $updateStmt->execute([$remarks ?: '', $orderId]);
        error_log("Order $orderId completion remarks updated successfully");
    }
    
    if ($updateResult) {
        return json_encode([
            "success" => true, 
            "message" => "Completion remarks updated successfully"
        ]);
    } else {
        error_log("Failed to update completion remarks for order $orderId");
        http_response_code(500);
        return json_encode([
            "success" => false, 
            "error" => "Failed to update completion remarks"
        ]);
    }
}

public function updateOrderStatus($orderId, $status, $pickupDate = null) {
    // Debug logging
    error_log("=== UPDATE ORDER STATUS DEBUG ===");
    error_log("OrderID: $orderId");
    error_log("New Status: $status");
    error_log("Pickup Date: " . ($pickupDate ?: 'NULL'));
    
    // Check if order exists
    $checkStmt = $this->db->prepare("SELECT id, status as current_status FROM orders WHERE id = ?");
    $checkStmt->execute([$orderId]);
    $order = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        error_log("Order $orderId does not exist");
        http_response_code(404);
        return json_encode([
            "success" => false, 
            "error" => "Order not found"
        ]);
    }
    
    error_log("Updating order $orderId from {$order['current_status']} to $status");
    
    // Update order status and pickup date
    if ($pickupDate) {
        $updateStmt = $this->db->prepare("UPDATE orders SET status = ?, pickup_date = ? WHERE id = ?");
        $updateStmt->execute([$status, $pickupDate, $orderId]);
    } else {
        $updateStmt = $this->db->prepare("UPDATE orders SET status = ? WHERE id = ?");
        $updateStmt->execute([$status, $orderId]);
    }
    
    error_log("Order updated successfully");
    return json_encode([
        "success" => true, 
        "message" => "Order updated successfully",
        "pickup_date" => $pickupDate
    ]);
}

public function getOrderById($orderId) {
    // Debug logging
    error_log("=== GET ORDER BY ID DEBUG ===");
    error_log("OrderID: $orderId");
    
    if (!$orderId) {
        http_response_code(400);
        return json_encode([
            "success" => false,
            "error" => "Order ID is required"
        ]);
    }
    
    $stmt = $this->db->prepare("
        SELECT o.*, u.name as customer_name, u.cellphone as customer_cellphone 
        FROM orders o 
        LEFT JOIN users u ON o.customer = u.email 
        WHERE o.id = ?
    ");
    $stmt->execute([$orderId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        http_response_code(404);
        return json_encode([
            "success" => false,
            "error" => "Order not found"
        ]);
    }
    
    return json_encode([
        "success" => true,
        "order" => $order
    ]);
}

public function getOrdersByStatus($status) {
    // Debug logging
    error_log("=== GET ORDERS BY STATUS DEBUG ===");
    error_log("Status: $status");
    
    $stmt = $this->db->prepare("
        SELECT o.*, u.name as customer_name, u.cellphone as customer_cellphone 
        FROM orders o 
        LEFT JOIN users u ON o.customer = u.email 
        WHERE o.status = ?
        ORDER BY o.created_at DESC
    ");
    $stmt->execute([$status]);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    return json_encode([
        "success" => true,
        "orders" => $orders
    ]);
}

public function getOrderStats() {
    // Debug logging
    error_log("=== GET ORDER STATS DEBUG ===");
    
    $stmt = $this->db->query("
        SELECT 
            COUNT(*) as total_orders,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
            SUM(CASE WHEN status = 'pending-production' THEN 1 ELSE 0 END) as pending_production_orders,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_orders,
            SUM(CASE WHEN status = 'ready-for-pickup' THEN 1 ELSE 0 END) as ready_orders,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
            SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined_orders
        FROM orders
    ");
    
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return json_encode([
        "success" => true,
        "stats" => $stats
    ]);
}

private function getFutureDate($days) {
    $date = new DateTime();
    $date->modify("+$days days");
    return $date->format('Y-m-d');
}
}