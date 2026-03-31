<?php
require_once __DIR__ . '/env.php';

date_default_timezone_set("Asia/Manila");
set_time_limit(1000);

$timezone = env('APP_TIMEZONE', 'Asia/Manila');
if (!empty($timezone)) {
    date_default_timezone_set($timezone);
}

define("SERVER", env('DB_HOST', 'localhost'));
define("DATABASE", env('DB_NAME', 'e-comm'));
define("USER", env('DB_USER', 'root'));
define("PASSWORD", env('DB_PASSWORD', ''));
define("DB_CHARSET", env('DB_CHARSET', 'utf8mb4'));

define("DRIVER", env('DB_DRIVER', 'mysql'));

class Connection
{
    private $connectionString = DRIVER . ":host=" . SERVER . ";dbname=" . DATABASE . ";charset=" . DB_CHARSET;
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
