<?php
// Debug script to check what Router.php receives
header("Content-Type: application/json");

echo json_encode([
    'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'],
    'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'not set',
    'SCRIPT_NAME' => $_SERVER['SCRIPT_NAME'] ?? 'not set',
    'GET_request' => $_GET['request'] ?? 'not set',
    'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? 'not set',
    'HTTP_ORIGIN' => $_SERVER['HTTP_ORIGIN'] ?? 'not set',
    'all_GET' => $_GET,
    'all_POST' => file_get_contents('php://input')
]);
