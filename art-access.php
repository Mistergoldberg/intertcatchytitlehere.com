<?php
// Simple form handler for access requests.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /writing/index.html');
    exit;
}

$email = isset($_POST['email']) ? trim($_POST['email']) : '';

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    exit('Please provide a valid email.');
}

$to = 'me@mistergoldberg.com';
$subject = 'Art access request';
$from = 'noreply@intertcatchytitlehere.com';
$lines = [];
$lines[] = 'Email: ' . $email;
$message = implode("\n", $lines);
$headers = [];
$headers[] = 'From: ' . $from;
$headers[] = 'Reply-To: ' . $email;
$headers[] = 'Content-Type: text/plain; charset=UTF-8';

mail($to, $subject, $message, implode("\r\n", $headers));

header('Location: /writing/index.html');
exit;
?>
