<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Auth;
use App\Core\Container;
use App\Core\Response;
use App\Core\View;

final class DashboardController
{
  // ─── Dashboard principal ────────────────────────────────────────────────

  public function index(): void
  {
    Auth::requireLogin();
    $pdo = Container::get('db');

    // Stats globales
    $statsRow = $pdo->query(
      "SELECT COUNT(*) AS total,
              SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS activos,
              SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) AS bloqueados
         FROM devices"
    )->fetch();

    $today        = date('Y-m-d');
    $checksHoy    = (int)$pdo->prepare(
      "SELECT COUNT(*) FROM license_checks WHERE created_at >= ? AND created_at < ?"
    )->execute([$today . ' 00:00:00', $today . ' 23:59:59']) ? $pdo->query(
      "SELECT COUNT(*) FROM license_checks WHERE created_at >= '{$today} 00:00:00' AND created_at < '{$today} 23:59:59'"
    )->fetchColumn() : 0;

    // Búsqueda / filtro
    $q      = trim((string)($_GET['q']      ?? ''));
    $status = (string)($_GET['status'] ?? 'all');

    $where  = [];
    $params = [];

    if ($q !== '') {
      $where[]  = "(device_name LIKE ? OR last_username LIKE ? OR device_id LIKE ?)";
      $like     = '%' . $q . '%';
      $params[] = $like;
      $params[] = $like;
      $params[] = $like;
    }
    if ($status === 'active')   { $where[] = "active = 1"; }
    if ($status === 'inactive') { $where[] = "active = 0"; }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $pdo->prepare(
      "SELECT id, device_id, device_name, last_username, last_platform,
              last_app_version, last_seen_at, active, created_at, notes, expires_at
         FROM devices
        {$whereClause}
        ORDER BY last_seen_at DESC, id DESC
        LIMIT 500"
    );
    $stmt->execute($params);
    $devices = $stmt->fetchAll();

    // Stats para el view (evitar segunda query para checksHoy)
    $checksHoy = (int)$pdo->query(
      "SELECT COUNT(*) FROM license_checks
        WHERE created_at >= '{$today} 00:00:00' AND created_at <= '{$today} 23:59:59'"
    )->fetchColumn();

    View::render('admin/dashboard', [
      'devices'    => $devices,
      'user'       => $_SESSION['admin_user'] ?? 'admin',
      'stats'      => $statsRow,
      'checksHoy'  => $checksHoy,
      'q'          => $q,
      'status'     => $status,
      'flash'      => (string)($_GET['msg'] ?? ''),
    ]);
  }

  // ─── Detalle de dispositivo ─────────────────────────────────────────────

  public function detailDevice(): void
  {
    Auth::requireLogin();
    $id  = (int)($_GET['id'] ?? 0);
    if ($id <= 0) { Response::redirect('/admin'); }

    $pdo  = Container::get('db');
    $stmt = $pdo->prepare(
      "SELECT id, device_id, device_name, last_username, last_platform,
              last_app_version, last_seen_at, active, created_at, notes, expires_at
         FROM devices WHERE id = ? LIMIT 1"
    );
    $stmt->execute([$id]);
    $device = $stmt->fetch();
    if (!$device) { Response::redirect('/admin'); }

    // Últimas 50 verificaciones
    $histStmt = $pdo->prepare(
      "SELECT id, created_at, ok, message, ip, username, platform, app_version
         FROM license_checks
        WHERE device_id = ?
        ORDER BY created_at DESC
        LIMIT 50"
    );
    $histStmt->execute([$device['device_id']]);
    $history = $histStmt->fetchAll();

    View::render('admin/device_detail', [
      'device'  => $device,
      'history' => $history,
      'user'    => $_SESSION['admin_user'] ?? 'admin',
      'flash'   => (string)($_GET['msg'] ?? ''),
    ]);
  }

  // ─── Guardar nota ───────────────────────────────────────────────────────

  public function noteDevice(): void
  {
    Auth::requireLogin();
    $id   = (int)($_POST['id'] ?? 0);
    $note = trim((string)($_POST['notes'] ?? ''));
    if ($id <= 0) { Response::redirect('/admin'); }

    $pdo  = Container::get('db');
    $stmt = $pdo->prepare("UPDATE devices SET notes = ?, updated_at = ? WHERE id = ?");
    $stmt->execute([$note ?: null, date('Y-m-d H:i:s'), $id]);

    Response::redirect('/admin/device/detail?id=' . $id . '&msg=nota_guardada');
  }

  // ─── Guardar expiración ─────────────────────────────────────────────────

  public function expiryDevice(): void
  {
    Auth::requireLogin();
    $id     = (int)($_POST['id'] ?? 0);
    $expiry = trim((string)($_POST['expires_at'] ?? ''));
    if ($id <= 0) { Response::redirect('/admin'); }

    // datetime-local entrega "YYYY-MM-DDTHH:MM"; normalizar a "YYYY-MM-DD HH:MM:SS"
    if ($expiry !== '') {
      $expiry = str_replace('T', ' ', $expiry);
      if (strlen($expiry) === 16) {
        $expiry .= ':00';
      }
    }

    $pdo  = Container::get('db');
    $stmt = $pdo->prepare("UPDATE devices SET expires_at = ?, updated_at = ? WHERE id = ?");
    $stmt->execute([$expiry ?: null, date('Y-m-d H:i:s'), $id]);

    Response::redirect('/admin/device/detail?id=' . $id . '&msg=expiracion_guardada');
  }

  // ─── Toggle activo/inactivo ─────────────────────────────────────────────

  public function toggleDevice(): void
  {
    Auth::requireLogin();
    $id   = (int)($_POST['id']   ?? 0);
    $next = (int)($_POST['next'] ?? 0);
    if ($id <= 0) { Response::redirect('/admin'); }

    $pdo  = Container::get('db');
    $stmt = $pdo->prepare("UPDATE devices SET active = ?, updated_at = ? WHERE id = ?");
    $stmt->execute([$next ? 1 : 0, date('Y-m-d H:i:s'), $id]);

    // Si viene del detalle, regresar al detalle
    $from = (string)($_POST['from'] ?? '');
    if ($from === 'detail') {
      Response::redirect('/admin/device/detail?id=' . $id . '&msg=estado_actualizado');
    }
    Response::redirect('/admin');
  }

  // ─── Eliminar dispositivo ───────────────────────────────────────────────

  public function deleteDevice(): void
  {
    Auth::requireLogin();
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) { Response::redirect('/admin'); }

    $pdo = Container::get('db');

    // Obtener device_id para borrar sus checks
    $row = $pdo->prepare("SELECT device_id FROM devices WHERE id = ? LIMIT 1");
    $row->execute([$id]);
    $device = $row->fetch();

    if ($device) {
      $pdo->prepare("DELETE FROM license_checks WHERE device_id = ?")->execute([$device['device_id']]);
      $pdo->prepare("DELETE FROM devices WHERE id = ?")->execute([$id]);
    }

    Response::redirect('/admin?msg=dispositivo_eliminado');
  }
}
