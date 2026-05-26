<?php
declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Container;
use App\Core\Response;

final class LicenseController
{
  public function check(): void
  {
    $config = Container::get('config');
    $apiKey = $config['api_key'] ?? '';

    $payload = $this->readJson();
    $clientKey = (string)($payload['api_key'] ?? '');

    if (!$apiKey || $clientKey !== $apiKey) {
      $this->logCheck($payload, false, 'invalid_api_key');
      Response::json(['active' => false, 'message' => 'invalid_api_key'], 401);
      return;
    }

    $deviceId = trim((string)($payload['device_id'] ?? ''));
    if ($deviceId === '') {
      $this->logCheck($payload, false, 'missing_device_id');
      Response::json(['active' => false, 'message' => 'missing_device_id'], 400);
      return;
    }

    $username = trim((string)($payload['username'] ?? ''));
    $platform = trim((string)($payload['platform'] ?? ''));
    $appVersion = trim((string)($payload['app_version'] ?? ''));
    $deviceName = isset($payload['device_name']) ? (string)$payload['device_name'] : null;

    $pdo = Container::get('db');

    // Upsert device
    $stmt = $pdo->prepare("SELECT id, active FROM devices WHERE device_id = ? LIMIT 1");
    $stmt->execute([$deviceId]);
    $row = $stmt->fetch();

    if (!$row) {
      $ins = $pdo->prepare("INSERT INTO devices(device_id, device_name, last_username, last_platform, last_app_version, last_seen_at, active)
                            VALUES(?,?,?,?,?,datetime('now'),1)");
      $ins->execute([$deviceId, $deviceName, $username ?: null, $platform ?: null, $appVersion ?: null]);
      $active = 1;
    } else {
      $active = (int)$row['active'];
      $upd = $pdo->prepare("UPDATE devices
                               SET device_name = COALESCE(?, device_name),
                                   last_username = ?,
                                   last_platform = ?,
                                   last_app_version = ?,
                                   last_seen_at = datetime('now'),
                                   updated_at = datetime('now')
                             WHERE device_id = ?");
      $upd->execute([
        $deviceName ?: null,
        $username ?: null,
        $platform ?: null,
        $appVersion ?: null,
        $deviceId,
      ]);
    }

    $ok = $active === 1;
    $this->logCheck($payload, $ok, $ok ? 'ok' : 'inactive');

    Response::json([
      'active' => $ok,
      'message' => $ok ? 'ok' : 'inactive',
    ]);
  }

  private function readJson(): array
  {
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
  }

  private function logCheck(array $payload, bool $ok, string $message): void
  {
    $deviceId = (string)($payload['device_id'] ?? '');
    $username = (string)($payload['username'] ?? '');
    $platform = (string)($payload['platform'] ?? '');
    $appVersion = (string)($payload['app_version'] ?? '');
    $ip = $_SERVER['REMOTE_ADDR'] ?? null;

    try {
      $pdo = Container::get('db');
      $stmt = $pdo->prepare("INSERT INTO license_checks(device_id, username, platform, app_version, ok, message, ip)
                             VALUES(?,?,?,?,?,?,?)");
      $stmt->execute([
        $deviceId,
        $username ?: null,
        $platform ?: null,
        $appVersion ?: null,
        $ok ? 1 : 0,
        $message,
        $ip,
      ]);
    } catch (\Throwable $e) {
      // No rompemos la respuesta por un fallo de log
    }
  }
}

