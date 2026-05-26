<?php
declare(strict_types=1);

session_start();

spl_autoload_register(function ($class) {
  $prefix = 'App\\';
  if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
    return;
  }
  $relative = substr($class, strlen($prefix));
  $path = __DIR__ . '/' . str_replace('\\', '/', $relative) . '.php';
  if (file_exists($path)) {
    require_once $path;
  }
});

$config = require __DIR__ . '/../config/config.php';
\App\Core\Container::set('config', $config);

// DB singleton
\App\Core\Container::set('db', function () use ($config) {
  $db = $config['db'] ?? [];
  $path = (string)($db['sqlite_path'] ?? '');
  if ($path === '') {
    throw new RuntimeException('Missing db.sqlite_path in config.');
  }

  $dir = dirname($path);
  if (!is_dir($dir)) {
    @mkdir($dir, 0775, true);
  }

  $dsn = 'sqlite:' . $path;
  $pdo = new PDO($dsn, null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);

  // Recomendado en SQLite
  $pdo->exec('PRAGMA foreign_keys = ON;');
  $pdo->exec('PRAGMA journal_mode = WAL;');

  // Asegura tablas (idempotente)
  require_once __DIR__ . '/migrate.php';
  \App\migrate($pdo);

  return $pdo;
});

