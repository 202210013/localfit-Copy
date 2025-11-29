<?php
date_default_timezone_set("Asia/Manila");
set_time_limit(1000);

define("SERVER", "localhost");
define("DATABASE", "e-comm");
define("USER", "root");
define("PASSWORD", "");

// define("SERVER", "localhost");
// define("DATABASE", "u385622194_ecomms_db");
// define("USER", "u385622194_ecomms");
// define("PASSWORD", "E-comm1225");
define("DRIVER", "mysql");

class Connection
{
    private $connectionString = DRIVER . ":host=" . SERVER . ";dbname=" . DATABASE . ";charset=utf8mb4";
    private $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ];

    public function connect()
    {
        try {
            return new PDO($this->connectionString, USER, PASSWORD, $this->options);
        } catch (PDOException $e) {
            error_log("Database Connection Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'error' => true,
                'message' => 'Database connection failed. Please contact support.',
                'details' => $e->getMessage()
            ]);
            exit();
        }
    }
}
