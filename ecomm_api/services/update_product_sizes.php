<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, PUT, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once(__DIR__ . '/../config/database.php');
require_once(__DIR__ . '/ProductService.php');

// Initialize database connection
$connection = new Connection();
$db = $connection->connect();

// Get JSON input
$input = json_decode(file_get_contents("php://input"), true);

// Validate required fields
if (!isset($input['product_id']) || !isset($input['available_sizes']) || !isset($input['user_id']) || !isset($input['token'])) {
    http_response_code(400);
    echo json_encode([
        "error" => "Missing required fields: product_id, available_sizes, user_id, token"
    ]);
    exit();
}

try {
    // Create product service instance
    $productService = new ProductService($db, $input['user_id'], $input['token']);
    
    // Validate token
    require_once(__DIR__ . '/UserService.php');
    $userService = new UserService($db);
    $tokenValidation = json_decode($userService->validateToken($input['token']), true);
    
    if (!$tokenValidation['valid']) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid token"]);
        exit();
    }
    
    // Validate product ownership
    $checkQuery = "SELECT user_id FROM products WHERE id = :product_id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(":product_id", $input['product_id']);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() == 0) {
        http_response_code(404);
        echo json_encode(["error" => "Product not found"]);
        exit();
    }
    
    $product = $checkStmt->fetch(PDO::FETCH_ASSOC);
    if ($product['user_id'] != $input['user_id']) {
        http_response_code(403);
        echo json_encode(["error" => "You don't have permission to update this product"]);
        exit();
    }
    
    // Validate sizes array
    if (!is_array($input['available_sizes'])) {
        http_response_code(400);
        echo json_encode(["error" => "available_sizes must be an array"]);
        exit();
    }
    
    // Allowed sizes
    $allowed_sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    foreach ($input['available_sizes'] as $size) {
        if (!in_array($size, $allowed_sizes)) {
            http_response_code(400);
            echo json_encode([
                "error" => "Invalid size: $size. Allowed sizes: " . implode(', ', $allowed_sizes)
            ]);
            exit();
        }
    }
    
    // Update available sizes
    $available_sizes_json = json_encode($input['available_sizes']);
    $updateQuery = "UPDATE products SET available_sizes = :available_sizes WHERE id = :product_id";
    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->bindParam(":available_sizes", $available_sizes_json);
    $updateStmt->bindParam(":product_id", $input['product_id']);
    
    if ($updateStmt->execute()) {
        http_response_code(200);
        echo json_encode([
            "message" => "Product sizes updated successfully",
            "product_id" => $input['product_id'],
            "available_sizes" => $input['available_sizes']
        ]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to update product sizes"]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Server error: " . $e->getMessage()
    ]);
}
?>
