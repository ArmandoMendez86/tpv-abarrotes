-- SQLite: esquema de referencia (opcional).
-- Nota: el backend ya crea estas tablas automáticamente al arrancar
-- (ver `src/migrate.php`). Este archivo se deja por documentación.

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE INDEX IF NOT EXISTS idx_checks_device ON license_checks(device_id);
CREATE INDEX IF NOT EXISTS idx_checks_created ON license_checks(created_at);

