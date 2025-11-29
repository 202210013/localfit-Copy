<?php
require_once __DIR__ . '/../config/database.php';
require_once(__DIR__ . '/UserService.php');
class UserService
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function checkLoginStatus()
    {
        return json_encode(["loggedIn" => isset($_SESSION['user_id'])]);
    }

    public function loginUser($data)
    {
        $email = $data['email'];
        $password = $data['password'];

        $query = "SELECT * FROM users WHERE email = :email";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            $token = bin2hex(random_bytes(16));
            $_SESSION['token'] = $token;
            $_SESSION['user_id'] = $user['id'];
            return json_encode(["token" => $token, "user_id" => $user['id']]);
        } else {
            http_response_code(401);
            return json_encode(["error" => "Invalid email or password"]);
        }
    }

    public function logoutUser()
    {
        unset($_SESSION['token']);
        session_destroy();

        return json_encode(["message" => "Logged out successfully."]);
    }

    public function registerUser($data)
    {
        $name = $data['name'] ?? null;
        $email = $data['email'];
        $cellphone = $data['cellphone'] ?? null;
        $password = $data['password'];
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        $query = "INSERT INTO users (name, email, cellphone, password) VALUES (:name, :email, :cellphone, :password)";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":name", $name);
        $stmt->bindParam(":email", $email);
        $stmt->bindParam(":cellphone", $cellphone);
        $stmt->bindParam(":password", $hashedPassword);

        if ($stmt->execute()) {
            return json_encode(["message" => "User was registered successfully."]);
        } else {
            http_response_code(400);
            return json_encode(["error" => "Unable to register the user."]);
        }
    }

    public function setSession($data)
    {
        if (isset($data['userId'])) {
            $_SESSION['user_id'] = $data['userId'];
            return json_encode(["message" => "Session set successfully."]);
        } else {
            http_response_code(400);
            return json_encode(["error" => "Invalid data provided."]);
        }
    }

    public function validateToken($token)
    {
        if (isset($_SESSION['token']) && $_SESSION['token'] === $token) {
            return json_encode(["valid" => true, "user_id" => $_SESSION['user_id']]);
        } else {
            http_response_code(401);
            return json_encode(["valid" => false, "message" => "Invalid token."]);
        }
    }
}
