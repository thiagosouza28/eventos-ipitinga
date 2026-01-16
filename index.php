<?php
declare(strict_types=1);

/*
Security (if .env is inside public_html):
- Prefer moving .env outside public_html.
- If it must stay, block access with .htaccess:

Apache 2.4:
<Files ".env">
    Require all denied
</Files>

Apache 2.2:
<Files ".env">
    Order allow,deny
    Deny from all
</Files>
*/

$pdo = require __DIR__ . '/config/database.php';

try {
    $stmt = $pdo->query('SELECT 1 AS connected');
    $row = $stmt->fetch();
    echo 'Connected: ' . ($row['connected'] ?? '0');
} catch (PDOException $e) {
    error_log('Query failed: ' . $e->getMessage());
    echo 'Query failed.';
}
