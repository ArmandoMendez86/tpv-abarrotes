<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Auth;
use App\Core\Container;

final class ExportController
{
  public function csv(): void
  {
    Auth::requireLogin();

    $pdo  = Container::get('db');
    $rows = $pdo->query(
      "SELECT device_id, device_name, last_username, last_platform, last_app_version,
              last_seen_at, active, expires_at, notes, created_at
         FROM devices
        ORDER BY last_seen_at DESC, id DESC"
    )->fetchAll();

    $filename = 'licencias_' . date('Y-m-d_His') . '.csv';

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-cache, no-store');

    // BOM UTF-8 para que Excel lo abra correctamente
    echo "\xEF\xBB\xBF";

    $out = fopen('php://output', 'w');

    fputcsv($out, [
      'Device ID', 'Nombre', 'Último usuario', 'Plataforma',
      'Versión app', 'Última conexión', 'Estado', 'Expira', 'Nota', 'Registrado el',
    ]);

    $now = date('Y-m-d H:i:s');
    foreach ($rows as $r) {
      $isExpired = !empty($r['expires_at']) && $r['expires_at'] < $now;
      $estado    = $isExpired ? 'Expirada' : ((int)$r['active'] === 1 ? 'Activa' : 'Bloqueada');

      fputcsv($out, [
        $r['device_id']       ?? '',
        $r['device_name']     ?? '',
        $r['last_username']   ?? '',
        $r['last_platform']   ?? '',
        $r['last_app_version'] ?? '',
        $r['last_seen_at']    ?? '',
        $estado,
        $r['expires_at']      ?? '',
        $r['notes']           ?? '',
        $r['created_at']      ?? '',
      ]);
    }

    fclose($out);
    exit;
  }

  public function bulk(): void
  {
    Auth::requireLogin();

    $action = (string)($_POST['bulk_action'] ?? '');
    $ids    = array_filter(array_map('intval', (array)($_POST['ids'] ?? [])));

    if (empty($ids) || !in_array($action, ['activate', 'block', 'delete'], true)) {
      $this->redirectBack('bulk_invalid');
      return;
    }

    $pdo         = Container::get('db');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $now          = date('Y-m-d H:i:s');

    match ($action) {
      'activate' => $pdo->prepare(
        "UPDATE devices SET active = 1, updated_at = ? WHERE id IN ({$placeholders})"
      )->execute([$now, ...$ids]),

      'block' => $pdo->prepare(
        "UPDATE devices SET active = 0, updated_at = ? WHERE id IN ({$placeholders})"
      )->execute([$now, ...$ids]),

      'delete' => (function () use ($pdo, $ids, $placeholders) {
        // Obtener device_ids para borrar sus checks
        $deviceIds = $pdo->prepare(
          "SELECT device_id FROM devices WHERE id IN ({$placeholders})"
        );
        $deviceIds->execute($ids);
        $dids = array_column($deviceIds->fetchAll(), 'device_id');

        if ($dids) {
          $dp = implode(',', array_fill(0, count($dids), '?'));
          $pdo->prepare("DELETE FROM license_checks WHERE device_id IN ({$dp})")->execute($dids);
        }

        $pdo->prepare("DELETE FROM devices WHERE id IN ({$placeholders})")->execute($ids);
      })(),
    };

    $this->redirectBack('bulk_ok');
  }

  private function redirectBack(string $msg): void
  {
    $ref = $_SERVER['HTTP_REFERER'] ?? '/admin';
    // Seguridad: solo redirigir a rutas internas
    $path = parse_url($ref, PHP_URL_PATH) ?: '/admin';
    header('Location: ' . $path . '?msg=' . $msg);
    exit;
  }
}
