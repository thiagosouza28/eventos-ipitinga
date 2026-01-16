<?php
declare(strict_types=1);

$envPath = dirname(__DIR__) . '/.env';
if (!is_file($envPath) || !is_readable($envPath)) {
    throw new RuntimeException('Missing or unreadable .env file.');
}

$lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
if ($lines === false) {
    throw new RuntimeException('Failed to read .env file.');
}

foreach ($lines as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#')) {
        continue;
    }

    $pos = strpos($line, '=');
    if ($pos === false) {
        continue;
    }

    $key = trim(substr($line, 0, $pos));
    $value = trim(substr($line, $pos + 1));

    if ($key === '') {
        continue;
    }

    if (
        (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
        (str_starts_with($value, "'") && str_ends_with($value, "'"))
    ) {
        $value = substr($value, 1, -1);
    }

    $_ENV[$key] = $value;
    putenv($key . '=' . $value);
}
