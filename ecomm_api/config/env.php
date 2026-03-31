<?php

if (!function_exists('env_load')) {
    /**
     * Load environment variables from a .env file into putenv(), $_ENV and $_SERVER.
     */
    function env_load($filePath)
    {
        static $loadedFiles = [];

        if (isset($loadedFiles[$filePath])) {
            return;
        }

        if (!is_file($filePath) || !is_readable($filePath)) {
            $loadedFiles[$filePath] = true;
            return;
        }

        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            $loadedFiles[$filePath] = true;
            return;
        }

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || strpos($trimmed, '#') === 0) {
                continue;
            }

            $pos = strpos($trimmed, '=');
            if ($pos === false) {
                continue;
            }

            $key = trim(substr($trimmed, 0, $pos));
            $value = trim(substr($trimmed, $pos + 1));

            if ($key === '') {
                continue;
            }

            // Strip optional wrapping quotes.
            if (
                (strlen($value) >= 2) &&
                (($value[0] === '"' && substr($value, -1) === '"') || ($value[0] === "'" && substr($value, -1) === "'"))
            ) {
                $value = substr($value, 1, -1);
            }

            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }

        $loadedFiles[$filePath] = true;
    }
}

if (!function_exists('env')) {
    /**
     * Fetch an environment variable with a default fallback.
     */
    function env($key, $default = null)
    {
        $value = getenv($key);

        if ($value === false) {
            return $default;
        }

        return $value;
    }
}

env_load(__DIR__ . '/.env');
