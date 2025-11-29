<?php
// Prevent PHP warnings from breaking JSON output
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();

// CORS is now handled by .htaccess - don't duplicate headers here
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/services/ProductService.php';
require_once __DIR__ . '/services/ProductService1.php';
require_once __DIR__ . '/services/CartService.php';
require_once __DIR__ . '/services/UserService.php';
require_once __DIR__ . '/services/MessageService.php';
require_once __DIR__ . '/services/OrderService.php';
require_once __DIR__ . '/services/RatingService.php';

$db = (new Connection())->connect();

$productService = new ProductService($db, $_SESSION['user_id'] ?? null, $_SESSION['token'] ?? null);
// $productService = isset($_SESSION['user_id']) ? new ProductService($db, $_SESSION['user_id'], $_SESSION['token']) : null;
$productService1 = new ProductService1($db);
// $cartService = isset($_SESSION['user_id']) ? new CartService($db, $_SESSION['user_id'], $_SESSION['token']) : null;
$cartService = new CartService($db, $_SESSION['user_id'] ?? null, $_SESSION['token'] ?? null);
$userService = new UserService($db);
$messageService = new MessageService($db);
$orderService = new OrderService($db);
$ratingService = new RatingService($db);




$method = $_SERVER['REQUEST_METHOD'];

// Support both query string and clean URLs
if (isset($_GET['request'])) {
    $url = $_GET['request'];
} else {
    // Extract path from REQUEST_URI for clean URLs
    $requestUri = $_SERVER['REQUEST_URI'];
    $scriptName = dirname($_SERVER['SCRIPT_NAME']);
    $url = str_replace($scriptName, '', parse_url($requestUri, PHP_URL_PATH));
    $url = trim($url, '/');
}

$request = explode('/', trim($url, '/'));

// function requireAuthentication()
// {
//     if (!isset($_SESSION['user_id']) || !isset($_SESSION['token'])) {
//         http_response_code(401);
//         echo json_encode(["error" => "Unauthorized"]);
//         exit();
//     }

//     // Validate token
//     global $userService;
//     $tokenValidation = json_decode($userService->validateToken($_SESSION['token']), true);
//     if (!$tokenValidation['valid']) {
//         http_response_code(401);
//         echo json_encode(["error" => "Invalid token."]);
//         exit();
//     }
// }

function requireAuthentication()
{
    global $userService;
    $token = getBearerToken();
    if (!$token) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized"]);
        exit();
    }
    $tokenValidation = json_decode($userService->validateToken($token), true);
    if (!$tokenValidation['valid']) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid token."]);
        exit();
    }
}

function getBearerToken() {
    $headers = [];
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
    }
    if (isset($headers['Authorization'])) {
        if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
            return $matches[1];
        }
    }
    // Fallback for some servers
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        if (preg_match('/Bearer\s(\S+)/', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
            return $matches[1];
        }
    }
    return null;
}

switch ($method) {
    case 'GET':
        switch ($request[0]) {
            case 'products':
                // requireAuthentication();
                echo $productService->readProducts();
                break;
            case 'product-listing':
                // requireAuthentication();
                echo $productService->readAllProducts();
                break;
            case 'product-listing-offline':
                echo $productService1->readAllProducts1();
                break;
            case 'orders':
                // Check if specific order ID is requested
                if (isset($request[1]) && !empty($request[1])) {
                    echo $orderService->getOrderById($request[1]);
                } else {
                    echo json_encode($orderService->getAllOrders());
                }
                break;
            case 'orders-by-status':
                $status = $_GET['status'] ?? null;
                if ($status) {
                    echo $orderService->getOrdersByStatus($status);
                } else {
                    http_response_code(400);
                    echo json_encode(["error" => "Status parameter is required"]);
                }
                break;
            case 'order-stats':
                echo $orderService->getOrderStats();
                break;
            case 'products-read':
                $id = $_GET['id'] ?? null;
                if (!empty($id)) {
                    echo $productService->readOneProduct($id);
                } else {
                    http_response_code(400);
                    echo json_encode(["error" => "Product ID is required"]);
                }
                break;
            case 'carts':
                // requireAuthentication();
                echo $cartService->readCarts();
                break;
            case 'carts-read':
                $id = $_GET['id'] ?? null;
                if (!empty($id)) {
                    echo $cartService->readOneCart($id);
                } else {
                    http_response_code(400);
                    echo json_encode(["error" => "Cart ID is required"]);
                }
                break;
            case 'cart-summary':
                requireAuthentication();
                echo $cartService->getCartSummary();
                break;
            case 'check_login_status':
                echo $userService->checkLoginStatus();
                break;
            case 'getAllUserEmails':
                echo json_encode($userService->getAllEmails());
                break;
            case 'all-users':
                echo json_encode($userService->getAllUsers());
                break;
            case 'messages':
                $user1 = $_GET['user1'] ?? '';
                $user2 = $_GET['user2'] ?? '';
                if ($user1 && $user2) {
                echo json_encode($messageService->getMessagesBetween($user1, $user2));
         } else {
                 http_response_code(400);
                echo json_encode(["error" => "user1 and user2 required"]);
     }
        break;
            
            case 'ratings':
                // Get all ratings (requires authentication for admin view)
                if (!isset($request[1])) {
                    requireAuthentication();
                    echo $ratingService->getAllRatings();
                }
                // Get ratings for a specific product or order
                elseif ($request[1] === 'product' && isset($request[2])) {
                    // GET /ratings/product/{productId}
                    echo $ratingService->getRatingsByProduct($request[2]);
                }
                elseif ($request[1] === 'order' && isset($request[2])) {
                    // GET /ratings/order/{orderId}
                    echo $ratingService->getRatingByOrder($request[2]);
                }
                elseif ($request[1] === 'summary' && isset($request[2])) {
                    // GET /ratings/summary/{productId}
                    echo $ratingService->getProductRatingSummary($request[2]);
                }
                else {
                    http_response_code(404);
                    echo json_encode(["error" => "Rating endpoint not found"]);
                }
                break;
            
            default:
                http_response_code(404);
                echo json_encode(["error" => "Endpoint not found"]);
        }
        break;

    case 'POST':
        switch ($request[0]) {
            
            case 'register':
                // For JSON payloads
                $data = json_decode(file_get_contents('php://input'), true);
                if (!$data) $data = $_POST; // fallback for form-data
                echo $userService->registerUser($data);
                break;
                
            case 'login':
                $data = json_decode(file_get_contents('php://input'), true);
                if (!$data) $data = $_POST;
                 echo $userService->loginUser($data);
                 break;

            case 'logout':
                echo $userService->logoutUser();
                break;    

            case 'products-create':
                requireAuthentication();
                echo $productService->createProduct();
                break;

            case 'carts-create':
                requireAuthentication();
                $data = json_decode(file_get_contents("php://input"));
                echo $cartService->createCart($data);
                break;

            case 'products-update':
                requireAuthentication();
                $id = $request[1] ?? null;
                if (!empty($id)) {
                    echo $productService->updateProduct($id);
                } else {
                    http_response_code(400);
                    echo json_encode(["error" => "Product ID is required"]);
                }
                break;

            case 'carts-update':
                requireAuthentication();
                $data = json_decode(file_get_contents("php://input"));
                echo $cartService->updateCart($data);
                break;
                
             case 'set_session':
                $data = json_decode(file_get_contents("php://input"), true);
                echo $userService->setSession($data);
                break;
            case 'send-message':
                 $data = json_decode(file_get_contents('php://input'), true);
                echo $messageService->saveMessage($data);
            break;

            case 'orders':
                $data = json_decode(file_get_contents('php://input'), true);
                
                // Debug logging for troubleshooting
                error_log("=== ORDERS API DEBUG ===");
                error_log("Data received: " . print_r($data, true));
                error_log("Request method: " . $_SERVER['REQUEST_METHOD']);
                
                if (isset($data['action']) && $data['action'] === 'approve' && isset($data['orderId'])) {
                    requireAuthentication(); // Only admin can approve
                    echo $orderService->approveOrder($data['orderId']);
                }
                // ADD THIS BLOCK for decline
                elseif (isset($data['action']) && $data['action'] === 'decline' && isset($data['orderId'])) {
                    requireAuthentication(); // Only admin can decline
                    $remarks = isset($data['remarks']) ? $data['remarks'] : null;
                    echo $orderService->declineOrder($data['orderId'], $remarks);
                }
                // ADD THIS BLOCK for ready-for-pickup
                elseif (isset($data['action']) && $data['action'] === 'ready-for-pickup' && isset($data['orderId'])) {
                    requireAuthentication(); // Only admin can mark ready for pickup
                    echo $orderService->markReadyForPickup($data['orderId']);
                }
                // ADD THIS BLOCK for confirm-pickup
                elseif (isset($data['action']) && $data['action'] === 'confirm-pickup' && isset($data['orderId']) && isset($data['customerEmail'])) {
                    error_log("Confirm pickup request - OrderID: {$data['orderId']}, Customer: {$data['customerEmail']}");
                    $orNumber = isset($data['orNumber']) ? $data['orNumber'] : null;
                    error_log("OR Number: " . ($orNumber ?: "NULL"));
                    
                    // Temporarily remove authentication to debug
                    // requireAuthentication(); // Customer needs to be authenticated
                    
                    echo $orderService->confirmPickup($data['orderId'], $data['customerEmail'], $orNumber);
                }
                // Add completion remarks endpoint
                elseif (isset($data['action']) && $data['action'] === 'update-completion-remarks' && isset($data['orderId']) && isset($data['remarks'])) {
                    error_log("Update completion remarks request - OrderID: {$data['orderId']}");
                    error_log("Remarks data: " . $data['remarks']);
                    error_log("Size data: " . (isset($data['size']) ? $data['size'] : 'not provided'));
                    // Temporarily disable authentication for debugging
                    // requireAuthentication(); // Only admin can update completion remarks
                    $size = isset($data['size']) ? $data['size'] : null;
                    echo $orderService->updateCompletionRemarks($data['orderId'], $data['remarks'], $size);
                }
                // Test endpoint for debugging
                elseif (isset($data['action']) && $data['action'] === 'test-pickup') {
                    error_log("Test pickup endpoint reached");
                    echo json_encode(["success" => true, "message" => "Test endpoint working"]);
                }
                elseif (is_array($data) && isset($data[0]['customer'])) {
                    echo $orderService->createOrders($data);
                } else {
                    error_log("Invalid order data - falling through to 400 error");
                    error_log("Data structure: " . print_r($data, true));
                    http_response_code(400);
                    echo json_encode(["error" => "Invalid order data", "received_data" => $data]);
                }
            break;

            case 'messages-unread':
                requireAuthentication();
                if (!isset($_SESSION['user_id'])) {
                    http_response_code(401);
                    echo json_encode(["error" => "User not logged in"]);
                    exit();
                }
                $recipient = $_SESSION['user_id'];
                echo $messageService->getUnreadMessages($recipient);
            break;

            case 'ratings':
                // Submit a rating (requires authentication)
                requireAuthentication();
                $data = json_decode(file_get_contents('php://input'), true);
                
                if (!isset($data['orderId']) || !isset($data['productId']) || !isset($data['rating'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Order ID, Product ID, and rating are required'
                    ]);
                    break;
                }
                
                $userId = $_SESSION['user_id'] ?? null;
                if (!$userId) {
                    http_response_code(401);
                    echo json_encode([
                        'success' => false,
                        'error' => 'User not authenticated'
                    ]);
                    break;
                }
                
                $review = $data['review'] ?? null;
                echo $ratingService->submitRating(
                    $data['orderId'],
                    $data['productId'],
                    $userId,
                    $data['rating'],
                    $review
                );
            break;

            default:
                http_response_code(404);
                echo json_encode(["error" => "Endpoint not found"]);
        }
        break;
        break;

        case 'PUT':
            switch ($request[0]) {
                case 'orders':
                    requireAuthentication();
                    $orderId = $request[1] ?? null; // Extract order ID from URL (orders/123)
                    $data = json_decode(file_get_contents('php://input'), true);
                    
                    error_log("=== UPDATE ORDER DEBUG ===");
                    error_log("Order ID: $orderId");
                    error_log("Data: " . print_r($data, true));
                    
                    if (!$orderId) {
                        http_response_code(400);
                        echo json_encode([
                            "success" => false,
                            "error" => "Order ID is required"
                        ]);
                        break;
                    }
                    
                    $status = $data['status'] ?? null;
                    $pickupDate = $data['pickup_date'] ?? null;
                    
                    echo $orderService->updateOrderStatus($orderId, $status, $pickupDate);
                    break;
                    
                default:
                    http_response_code(404);
                    echo json_encode(["error" => "Endpoint not found"]);
            }
            break;
            
        case 'DELETE':
            switch ($request[0]) {
                case 'products-delete':
                    requireAuthentication();
                    $id = $request[1] ?? null; // Extract the product ID from the URL parameter
                    if (!empty($id)) {
                        echo $productService->deleteProduct($id);
                    } else {
                        http_response_code(400);
                        echo json_encode(["error" => "Product ID is required"]);
                    }
                    break;
                case 'carts-delete':
                    requireAuthentication();
                    $id = $request[1] ?? null; // Extract the cart ID from the URL parameter
                    if (!empty($id)) {
                        echo $cartService->deleteCart($id);
                    } else {
                        http_response_code(400);
                        echo json_encode(["error" => "Cart ID is required"]);
                    }
                    break;
                case 'carts-clear':
                    requireAuthentication();
                    echo $cartService->clearCart();
                    break;
                    
                default:
                    http_response_code(404);
                    echo json_encode(["error" => "Endpoint not found"]);
            }
            break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
        break;
}