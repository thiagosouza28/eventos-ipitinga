<?php
declare(strict_types=1);

require_once __DIR__ . '/env.php';

$host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'localhost';
$port = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '3306';
$name = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: '';
$user = $_ENV['DB_USER'] ?? getenv('DB_USER') ?: '';
$pass = $_ENV['DB_PASS'] ?? getenv('DB_PASS') ?: '';
$charset = $_ENV['DB_CHARSET'] ?? getenv('DB_CHARSET') ?: 'utf8mb4';

if ($name === '' || $user === '') {
    throw new RuntimeException('Database credentials are not set.');
}

$dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $host, $port, $name, $charset);

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    throw new RuntimeException('Database connection failed.');
}

return $pdo;
