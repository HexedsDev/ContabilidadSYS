<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Allow: POST, OPTIONS');
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Metodo no permitido. Usa POST.']]);
    exit;
}

function get_authorization_header(): string
{
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        return (string) $_SERVER['HTTP_AUTHORIZATION'];
    }

    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return (string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }

    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        foreach ($headers as $name => $value) {
            if (strtolower((string) $name) === 'authorization') {
                return (string) $value;
            }
        }
    }

    return '';
}

$authorization = get_authorization_header();
if (!preg_match('/^Bearer\s+.+$/i', $authorization)) {
    http_response_code(401);
    echo json_encode(['error' => ['message' => 'Falta Authorization: Bearer <OPENAI_API_KEY>.']]);
    exit;
}

$body = file_get_contents('php://input');
if ($body === false || trim($body) === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Solicitud vacia.']]);
    exit;
}

$target = 'https://api.openai.com/v1/responses';

if (function_exists('curl_init')) {
    $ch = curl_init($target);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: ' . $authorization,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => false,
        CURLOPT_CONNECTTIMEOUT => 20,
        CURLOPT_TIMEOUT => 120,
    ]);

    $response = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'No se pudo contactar OpenAI: ' . $curlError]]);
        exit;
    }

    http_response_code($status > 0 ? $status : 502);
    echo $response;
    exit;
}

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Authorization: {$authorization}\r\nContent-Type: application/json\r\n",
        'content' => $body,
        'ignore_errors' => true,
        'timeout' => 120,
    ],
]);

$response = file_get_contents($target, false, $context);
$status = 502;
if (isset($http_response_header) && is_array($http_response_header)) {
    foreach ($http_response_header as $header) {
        if (preg_match('/^HTTP\/\S+\s+(\d+)/', $header, $matches)) {
            $status = (int) $matches[1];
            break;
        }
    }
}

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'No se pudo contactar OpenAI desde el proxy PHP.']]);
    exit;
}

http_response_code($status);
echo $response;
