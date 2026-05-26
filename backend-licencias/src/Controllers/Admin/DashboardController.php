<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Auth;
use App\Core\Container;
use App\Core\Response;
use App\Core\View;

final class DashboardController
{
  public function index(): void
  {
    Auth::requireLogin();

    $pdo = Container::get('db');
    $devices = $pdo->query("SELECT id, device_id, device_name, last_username, last_platform, last_app_version, last_seen_at, active, created_at
                             FROM devices
                             ORDER BY last_seen_at DESC, id DESC
                             LIMIT 500")->fetchAll();

    View::render('admin/dashboard', [
      'devices' => $devices,
      'user' => $_SESSION['admin_user'] ?? 'admin',
    ]);
  }

  public function toggleDevice(): void
  {
    Auth::requireLogin();

    $id = (int)($_POST['id'] ?? 0);
    $next = (int)($_POST['next'] ?? 0);
    if ($id <= 0) {
      Response::redirect('/admin');
    }

    $pdo = Container::get('db');
    $stmt = $pdo->prepare("UPDATE devices SET active = ? WHERE id = ?");
    $stmt->execute([$next ? 1 : 0, $id]);

    Response::redirect('/admin');
  }
}

