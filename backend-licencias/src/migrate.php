<?php
declare(strict_types=1);

namespace App;

/**
 * Migración idempotente para SQLite.
 * Se ejecuta al abrir la conexión (bootstrap).
 */
function migrate(\PDO $pdo): void
{
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  ");

  $pdo->exec("
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL UNIQUE,
      device_name TEXT,
      last_username TEXT,
      last_platform TEXT,
      last_app_version TEXT,
      last_seen_at TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  ");

  $pdo->exec("
    CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen_at);
  ");

  $pdo->exec("
    CREATE TABLE IF NOT EXISTS license_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      username TEXT,
      platform TEXT,
      app_version TEXT,
      ok INTEGER NOT NULL,
      message TEXT,
      ip TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  ");

  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_checks_device ON license_checks(device_id);");
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_checks_created ON license_checks(created_at);");

  // Usuario admin inicial si no existe
  $stmt = $pdo->prepare("SELECT COUNT(*) AS c FROM admin_users WHERE username = 'admin' LIMIT 1");
  $stmt->execute();
  $row = $stmt->fetch();
  $count = (int)($row['c'] ?? 0);
  if ($count === 0) {
    $hash = password_hash('admin123', PASSWORD_DEFAULT);
    $ins = $pdo->prepare("INSERT INTO admin_users(username, password_hash) VALUES(?,?)");
    $ins->execute(['admin', $hash]);
  }
}

