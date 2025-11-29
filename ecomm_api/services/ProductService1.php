<?php
require_once(__DIR__ . '/UserService.php');

class ProductService1
{
    private $conn;
    private $table_name = "products";
    private $upload_dir;
    private $userId;
    private $token;

    public function __construct($db)
    {
        $this->conn = $db;
        // Use relative path from ecomm_api to ecomm-images folder
        $this->upload_dir = dirname(__DIR__, 2) . '/ecomm-images/';
    }

    public function createProduct()
    {

        // Verify the token before creating the task
        $userService = new UserService($this->conn);
        $tokenValidation = json_decode($userService->validateToken($this->token), true);
        if (!$tokenValidation['valid']) {
            http_response_code(401);
            return json_encode(["error" => "Invalid token."]);
        }

        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (isset($_FILES['image'])) {
            $image = $_FILES['image'];
            // ... (rest of the image validation and upload code)
        } else {
            http_response_code(400);
            return json_encode(["error" => "No image uploaded"]);
        }

        $data = [];
        foreach ($_POST as $key => $value) {
            $data[$key] = htmlspecialchars(strip_tags($value));
        }

        if (!isset($data['name']) || !isset($data['price']) || !isset($data['description'])) {
            http_response_code(400);
            return json_encode(["error" => "Null Data"]);
        }

        $name = htmlspecialchars(strip_tags($data['name']));
        $price = htmlspecialchars(strip_tags($data['price']));
        $description = htmlspecialchars(strip_tags($data['description']));
        $category = htmlspecialchars(strip_tags($data['category']));

        if (isset($_FILES['image'])) {
            $image = $_FILES['image'];
            if ($image['error'] === 0) {
                // Validate image type and size
                if (in_array($image['type'], ["image/jpeg", "image/png", "image/gif"])) {
                    if ($image['size'] <= 100000000) { // 100 MB
                        // Upload image to server
                        $image_path = $this->upload_dir . uniqid() . '_' . $image['name'];
                        move_uploaded_file($image['tmp_name'], $image_path);

                        // Store only the image name in the database
                        $image_name_only = basename($image_path);

                        // Insert into database
                        $query = "INSERT INTO " . $this->table_name . " 
                              SET name=:name, price=:price, description=:description, image=:image, category=:category, user_id=:user_id";
                        $stmt = $this->conn->prepare($query);

                        $stmt->bindParam(":name", $name);
                        $stmt->bindParam(":price", $price);
                        $stmt->bindParam(":description", $description);
                        $stmt->bindParam(":category", $category);
                        $stmt->bindParam(":image", $image_name_only);
                        $stmt->bindParam(":user_id", $this->userId);

                        if ($stmt->execute()) {
                            http_response_code(201);
                            return json_encode(["message" => "Product was created."]);
                        } else {
                            http_response_code(503);
                            return json_encode(["message" => "Unable to create product."]);
                        }
                    } else {
                        http_response_code(400);
                        return json_encode(["error" => "Image size exceeds 500 KB"]);
                    }
                } else {
                    http_response_code(400);
                    return json_encode(["error" => "Invalid image type"]);
                }
            } else {
                http_response_code(400);
                return json_encode(["error" => "Image upload failed"]);
            }
        } else {
            http_response_code(400);
            return json_encode(["error" => "No image uploaded"]);
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

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $products_arr["records"][] = $row;
        }

        return json_encode($products_arr);
    }

    public function readAllProducts()
    {
        // Verify the token before creating the task
        $userService = new UserService($this->conn);
        $tokenValidation = json_decode($userService->validateToken($this->token), true);
        if (!$tokenValidation['valid']) {
            http_response_code(401);
            return json_encode(["error" => "Invalid token."]);
        }


        $query = "SELECT * FROM " . $this->table_name . " ORDER BY id DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        $products_arr = ["records" => []];

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $products_arr["records"][] = $row;
        }

        return json_encode($products_arr);
    }

    public function readAllProducts1()
    {
        $query = "SELECT * FROM " . $this->table_name . " ORDER BY id DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        $products_arr = ["records" => []];

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
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

        // Check if new image is being uploaded
        if (isset($_FILES['image']) && $_FILES['image']['error'] === 0) {
            $image = $_FILES['image'];
            if (in_array($image['type'], ["image/jpeg", "image/png", "image/gif"])) {
                if ($image['size'] <= 500000) { // 500 KB
                    // Upload image to server
                    $image_path = $this->upload_dir . uniqid() . '_' . $image['name'];
                    move_uploaded_file($image['tmp_name'], $image_path);
                    $image_name_only = basename($image_path);

                    // Delete old image if a new one is uploaded
                    if ($product['image']) {
                        unlink($this->upload_dir . $product['image']);
                    }
                } else {
                    http_response_code(400);
                    return json_encode(["error" => "Image size exceeds 500 KB"]);
                }
            } else {
                http_response_code(400);
                return json_encode(["error" => "Invalid image type"]);
            }
        } else {
            $image_name_only = $product['image'];
        }

        // Update database
        $query = "UPDATE " . $this->table_name . " 
          SET name=:name, price=:price, description=:description, image=:image, category=:category 
          WHERE id = :id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":name", $name);
        $stmt->bindParam(":price", $price);
        $stmt->bindParam(":description", $description);
        $stmt->bindParam(":image", $image_name_only);
        $stmt->bindParam(":category", $category);
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