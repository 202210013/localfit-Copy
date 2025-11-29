<?php
// filepath: c:\xampp\htdocs\E-comms\ecomm\e-comm\ecomm_api\services\MessageService.php
class MessageService {
    private $db;
    public function __construct($db) {
        $this->db = $db;
    }

    public function getMessagesBetween($user1, $user2) {
        $stmt = $this->db->prepare(
            "SELECT sender, recipient, content, timestamp FROM messages 
             WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)
             ORDER BY id ASC"
        );
        $stmt->execute([$user1, $user2, $user2, $user1]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Accepts $data array: ['sender' => ..., 'recipient' => ..., 'content' => ...]
    public function saveMessage($data) {
        if (!isset($data['sender'], $data['recipient'], $data['content'])) {
            http_response_code(400);
            return json_encode(["error" => "Missing fields"]);
        }
        $stmt = $this->db->prepare(
            "INSERT INTO messages (sender, recipient, content) VALUES (?, ?, ?)"
        );
        if ($stmt->execute([$data['sender'], $data['recipient'], $data['content']])) {
            return json_encode(["success" => true]);
        } else {
            http_response_code(500);
            return json_encode(["error" => "Failed to save message"]);
        }
    }

    public function getUnreadMessages($recipient) {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) as count FROM messages WHERE recipient = ? AND is_read = 0"
        );
        $stmt->execute([$recipient]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return json_encode($result);
    }
}