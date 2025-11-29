<?php
require_once(__DIR__ . '/UserService.php');
class ProductService
{
    private $conn;
    private $table_name = "products";
    private $upload_dir;
    private $userId;
    private $token;

    public function __construct($db, $userId, $token)
    {
        $this->conn = $db;
        // Use relative path from ecomm_api to ecomm-images folder
        $this->upload_dir = dirname(__DIR__, 2) . '/ecomm-images/';
        $this->userId = $userId;
        $this->token = $token;
    }

    public function createProduct()
    {
        // Add error logging for debugging
        error_log("CREATE PRODUCT - Starting creation process");
        error_log("POST data: " . print_r($_POST, true));
        error_log("FILES data: " . print_r($_FILES, true));

        // Verify the token before creating the task
        $userService = new UserService($this->conn);
        $tokenValidation = json_decode($userService->validateToken($this->token), true);
        if (!$tokenValidation['valid']) {
            error_log("CREATE PRODUCT - Invalid token");
            http_response_code(401);
            return json_encode(["error" => "Invalid token."]);
        }

        if (!isset($_FILES['image'])) {
            error_log("CREATE PRODUCT - No image uploaded");
            http_response_code(400);
            return json_encode(["error" => "No image uploaded"]);
        }

        $data = [];
        foreach ($_POST as $key => $value) {
            $data[$key] = htmlspecialchars(strip_tags($value));
        }

        if (!isset($data['name']) || !isset($data['price']) || !isset($data['description'])) {
            error_log("CREATE PRODUCT - Missing required fields: " . print_r($data, true));
            http_response_code(400);
            return json_encode(["error" => "Missing required fields: name, price, or description"]);
        }

        // Validate price is numeric
        if (!is_numeric($data['price']) || $data['price'] <= 0) {
            error_log("CREATE PRODUCT - Invalid price: " . $data['price']);
            http_response_code(400);
            return json_encode(["error" => "Price must be a positive number"]);
        }

        $name = $data['name'];
        $price = $data['price'];
        $description = $data['description'];
        $category = isset($data['category']) ? $data['category'] : '';
        
        // Handle available sizes (JSON array)
        $availableSizes = [];
        if (isset($data['available_sizes'])) {
            if (is_string($data['available_sizes'])) {
                // If it comes as a JSON string, decode it
                $availableSizes = json_decode($data['available_sizes'], true);
            } elseif (is_array($data['available_sizes'])) {
                // If it comes as an array, use it directly
                $availableSizes = $data['available_sizes'];
            }
        }
        // Default to common sizes if none provided
        if (empty($availableSizes)) {
            $availableSizes = ['S', 'M', 'L', 'XL'];
        }
        $availableSizesJson = json_encode($availableSizes);

        $image = $_FILES['image'];
        error_log("CREATE PRODUCT - Image error code: " . $image['error']);
        error_log("CREATE PRODUCT - Image size: " . $image['size']);
        error_log("CREATE PRODUCT - Image type: " . $image['type']);

        if ($image['error'] === 0) {
            if (in_array($image['type'], ["image/jpeg", "image/png", "image/gif"])) {
                // Fix: Make size limit consistent (50MB = 50000000 bytes)
                if ($image['size'] <= 50000000) { // 50 MB
                    error_log("CREATE PRODUCT - Base upload directory: " . $this->upload_dir);
                    
                    // Check if base upload directory exists, create if not
                    if (!is_dir($this->upload_dir)) {
                        error_log("CREATE PRODUCT - Base upload directory doesn't exist, creating: " . $this->upload_dir);
                        if (!mkdir($this->upload_dir, 0777, true)) {
                            error_log("CREATE PRODUCT - Failed to create base upload directory");
                            http_response_code(500);
                            return json_encode(["error" => "Failed to create upload directory"]);
                        }
                    }

                    // Upload image directly to base folder (no date folder)
                    $uniqueName = uniqid() . '_' . basename($image['name']);
                    $imagePath = $this->upload_dir . $uniqueName;
                    
                    error_log("CREATE PRODUCT - Attempting to move file to: " . $imagePath);
                    
                    if (!move_uploaded_file($image['tmp_name'], $imagePath)) {
                        error_log("CREATE PRODUCT - Failed to move uploaded file");
                        http_response_code(500);
                        return json_encode(["error" => "Failed to upload image"]);
                    }
                    $image_name_only = $uniqueName;
                    error_log("CREATE PRODUCT - Image uploaded successfully: " . $image_name_only);
                } else {
                    error_log("CREATE PRODUCT - Image size exceeds limit: " . $image['size']);
                    http_response_code(400);
                    return json_encode(["error" => "Image size exceeds 50 MB"]);
                }
            } else {
                error_log("CREATE PRODUCT - Invalid image type: " . $image['type']);
                http_response_code(400);
                return json_encode(["error" => "Invalid image type. Only JPEG, PNG, and GIF are allowed."]);
            }
        } else {
            error_log("CREATE PRODUCT - Image upload error: " . $image['error']);
            http_response_code(400);
            return json_encode(["error" => "Image upload failed with error code: " . $image['error']]);
        }

        // Insert into database
        try {
            $query = "INSERT INTO " . $this->table_name . " 
            SET name=:name, price=:price, description=:description, image=:image, category=:category, available_sizes=:available_sizes, user_id=:user_id";
            $stmt = $this->conn->prepare($query);

            $stmt->bindParam(":name", $name);
            $stmt->bindParam(":price", $price);
            $stmt->bindParam(":description", $description);
            $stmt->bindParam(":category", $category);
            $stmt->bindParam(":image", $image_name_only);
            $stmt->bindParam(":available_sizes", $availableSizesJson);
            $stmt->bindParam(":user_id", $this->userId);

            if ($stmt->execute()) {
                error_log("CREATE PRODUCT - Product created successfully");
                http_response_code(201);
                return json_encode(["message" => "Product was created."]);
            } else {
                error_log("CREATE PRODUCT - Database execution failed: " . print_r($stmt->errorInfo(), true));
                http_response_code(503);
                return json_encode(["message" => "Unable to create product."]);
            }
        } catch (Exception $e) {
            error_log("CREATE PRODUCT - Database exception: " . $e->getMessage());
            http_response_code(500);
            return json_encode(["error" => "Database error: " . $e->getMessage()]);
        }
    }

    public function readProducts()
    {
        // Verify the token before creating the task
        $userService = new UserService($this->conn);
        $tokenValidation = json_decode($userService->validateToken($this->token), true);
        if (!$tokenValidation['valid']) {
            http_response_code(401);
            return json_encode(["error" => "Invalid token."]);
        }


        $query = "SELECT * FROM " . $this->table_name . " WHERE user_id = :user_id ORDER BY id DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->userId);
        $stmt->execute();

        $products_arr = ["records" => []];
        $base_url = 'https://images.localfit.store/';
    
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $row['image'] = $base_url . $row['image'];
            // Parse available_sizes JSON if it exists
            if (isset($row['available_sizes']) && !empty($row['available_sizes'])) {
                $row['available_sizes'] = json_decode($row['available_sizes'], true);
            } else {
                // Default sizes if none specified
                $row['available_sizes'] = ['S', 'M', 'L', 'XL'];
            }
            $products_arr["records"][] = $row;
        }

        return json_encode($products_arr);
    }
    
//     public function readProducts()
// {
//     // Remove token validation for public access
//     // $userService = new UserService($this->conn);
//     // $tokenValidation = json_decode($userService->validateToken($this->token), true);
//     // if (!$tokenValidation['valid']) {
//     //     http_response_code(401);
//     //     return json_encode(["error" => "Invalid token."]);
//     // }

//     // Select all products, not just by user
//     $query = "SELECT * FROM " . $this->table_name . " ORDER BY id DESC";
//     $stmt = $this->conn->prepare($query);
//     $stmt->execute();

//     $products_arr = ["records" => []];
//     $base_url = 'http://localhost/E-comms/ecomm/e-comm/e-comm-images/';
//     while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
//         $row['image'] = $base_url . $row['image'];
//         $products_arr["records"][] = $row;
//     }

//     return json_encode($products_arr);
// }

    // public function readAllProducts()
    // {
    //     // Verify the token before creating the task
    //     $userService = new UserService($this->conn);
    //     $tokenValidation = json_decode($userService->validateToken($this->token), true);
    //     if (!$tokenValidation['valid']) {
    //         http_response_code(401);
    //         return json_encode(["error" => "Invalid token."]);
    //     }

    //     // JOIN users to get seller_name
    //     $query = "SELECT p.*, u.name AS seller_name
    //               FROM " . $this->table_name . " p
    //               JOIN users u ON p.user_id = u.id
    //               ORDER BY p.id DESC";
    //     $stmt = $this->conn->prepare($query);
    //     $stmt->execute();

    //     $products_arr = ["records" => []];

    //     while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    //         $products_arr["records"][] = $row;
    //     }

    //     return json_encode($products_arr);
    // }
    
    public function readAllProducts()
{
    // REMOVE token validation for public access
    $query = "SELECT p.*, u.name AS seller_name
              FROM " . $this->table_name . " p
              JOIN users u ON p.user_id = u.id
              ORDER BY p.id DESC";
    $stmt = $this->conn->prepare($query);
    $stmt->execute();

    $products_arr = ["records" => []];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Parse available_sizes JSON if it exists
        if (isset($row['available_sizes']) && !empty($row['available_sizes'])) {
            $row['available_sizes'] = json_decode($row['available_sizes'], true);
        } else {
            // Default sizes if none specified
            $row['available_sizes'] = ['S', 'M', 'L', 'XL'];
        }
        $products_arr["records"][] = $row;
    }

    return json_encode($products_arr);
}

    public function readOneProduct($id)
    {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":id", $id);

        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            return json_encode($product);
        } else {
            http_response_code(404);
            return json_encode(["message" => "Product not found."]);
        }
    }

    public function updateProduct($id)
    {
        // Verify the token before creating the task
        $userService = new UserService($this->conn);
        $tokenValidation = json_decode($userService->validateToken($this->token), true);
        if (!$tokenValidation['valid']) {
            http_response_code(401);
            return json_encode(["error" => "Invalid token."]);
        }

        // Check if product exists
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":user_id", $this->userId);
        $stmt->execute();

        if ($stmt->rowCount() == 0) {
            http_response_code(404);
            return json_encode(["message" => "Product not found."]);
        }

        // Get current product data
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        // Update product data from form-data
        $name = isset($_POST['name']) ? htmlspecialchars(strip_tags($_POST['name'])) : $product['name'];
        $price = isset($_POST['price']) ? htmlspecialchars(strip_tags($_POST['price'])) : $product['price'];
        $description = isset($_POST['description']) ? htmlspecialchars(strip_tags($_POST['description'])) : $product['description'];
        $category = isset($_POST['category']) ? htmlspecialchars(strip_tags($_POST['category'])) : $product['category'];
        
        // Handle available sizes (JSON array)
        $availableSizes = [];
        if (isset($_POST['available_sizes'])) {
            if (is_string($_POST['available_sizes'])) {
                // If it comes as a JSON string, decode it
                $availableSizes = json_decode($_POST['available_sizes'], true);
            } elseif (is_array($_POST['available_sizes'])) {
                // If it comes as an array, use it directly
                $availableSizes = $_POST['available_sizes'];
            }
        }
        // Keep existing sizes if none provided in update
        if (empty($availableSizes)) {
            $availableSizes = isset($product['available_sizes']) && !empty($product['available_sizes']) 
                ? json_decode($product['available_sizes'], true) 
                : ['S', 'M', 'L', 'XL'];
        }
        $availableSizesJson = json_encode($availableSizes);

        // Check if new image is being uploaded
        if (isset($_FILES['image']) && $_FILES['image']['error'] === 0) {
            $image = $_FILES['image'];
            if (in_array($image['type'], ["image/jpeg", "image/png", "image/gif"])) {
                if ($image['size'] <= 50000000) { // 50 MB
                    // Upload image directly to base folder (no date folder)
                    $uniqueName = uniqid() . '_' . basename($image['name']);
                    $image_path = $this->upload_dir . $uniqueName;
                    move_uploaded_file($image['tmp_name'], $image_path);
                    $image_name_only = $uniqueName;

                    // Delete old image if a new one is uploaded
                    if ($product['image'] && file_exists($this->upload_dir . $product['image'])) {
                        unlink($this->upload_dir . $product['image']);
                    }
                } else {
                    http_response_code(400);
                    return json_encode(["error" => "Image size exceeds 50 MB"]);
                }
            } else {
                http_response_code(400);
                return json_encode(["error" => "Invalid image type"]);
            }
        } else {
            $image_name_only = $product['image'];
        }

        // Handle size_quantities if provided (JSON string or array)
        $sizeQuantitiesJson = null;
        $totalQuantity = null;
        if (isset($_POST['size_quantities'])) {
            if (is_string($_POST['size_quantities'])) {
                $parsed = json_decode($_POST['size_quantities'], true);
                $sizeQuantities = is_array($parsed) ? $parsed : [];
            } elseif (is_array($_POST['size_quantities'])) {
                $sizeQuantities = $_POST['size_quantities'];
            } else {
                $sizeQuantities = [];
            }
            $sizeQuantitiesJson = json_encode($sizeQuantities);
            $totalQuantity = array_sum(array_map(function($v){ return intval($v); }, $sizeQuantities));
        }

        // Optional: handle starting_size_quantities (to track starting stock). If provided, store JSON.
        $startingQuantitiesJson = null;
        if (isset($_POST['starting_size_quantities'])) {
            if (is_string($_POST['starting_size_quantities'])) {
                $parsed = json_decode($_POST['starting_size_quantities'], true);
                $startingQuantities = is_array($parsed) ? $parsed : [];
            } elseif (is_array($_POST['starting_size_quantities'])) {
                $startingQuantities = $_POST['starting_size_quantities'];
            } else {
                $startingQuantities = [];
            }
            $startingQuantitiesJson = json_encode($startingQuantities);
        }

        // Build update query dynamically to include optional fields
        $fields = [
            'name' => ':name',
            'price' => ':price',
            'description' => ':description',
            'image' => ':image',
            'category' => ':category',
            'available_sizes' => ':available_sizes'
        ];
        if ($sizeQuantitiesJson !== null) {
            $fields['size_quantities'] = ':size_quantities';
            $fields['quantity'] = ':quantity';
        }
        if ($startingQuantitiesJson !== null) {
            $fields['starting_size_quantities'] = ':starting_size_quantities';
        }

        $setParts = [];
        foreach ($fields as $col => $param) {
            $setParts[] = "$col = $param";
        }
        $setClause = implode(', ', $setParts);

        $query = "UPDATE " . $this->table_name . " SET $setClause WHERE id = :id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":name", $name);
        $stmt->bindParam(":price", $price);
        $stmt->bindParam(":description", $description);
        $stmt->bindParam(":image", $image_name_only);
        $stmt->bindParam(":category", $category);
        $stmt->bindParam(":available_sizes", $availableSizesJson);
        if ($sizeQuantitiesJson !== null) {
            $stmt->bindParam(":size_quantities", $sizeQuantitiesJson);
            $stmt->bindParam(":quantity", $totalQuantity);
        }
        if ($startingQuantitiesJson !== null) {
            $stmt->bindParam(":starting_size_quantities", $startingQuantitiesJson);
        }
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(':user_id', $this->userId);

        if ($stmt->execute()) {
            http_response_code(200);
            return json_encode(["message" => "Product was updated."]);
        } else {
            http_response_code(503);
            return json_encode(["message" => "Unable to update product."]);
        }
    }



    public function deleteProduct($id)
    {
        // Verify the token before creating the task
        $userService = new UserService($this->conn);
        $tokenValidation = json_decode($userService->validateToken($this->token), true);
        if (!$tokenValidation['valid']) {
            http_response_code(401);
            return json_encode(["error" => "Invalid token."]);
        }


        $query = "SELECT image FROM " . $this->table_name . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(':user_id', $this->userId);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $image_path = $row['image'];
            unlink($this->upload_dir . $image_path);
        }

        // Delete product's record from carts table
        $query = "DELETE FROM carts WHERE product_id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();

        // Delete product from products table
        $query = "DELETE FROM " . $this->table_name . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(':user_id', $this->userId);
        $stmt->execute();



        if ($stmt->execute()) {
            http_response_code(200);
            return json_encode(["message" => "Product was deleted."]);
        } else {
            http_response_code(503);
            return json_encode(["message" => "Unable to delete product."]);
        }
    }
}