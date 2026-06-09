<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Auth;
use App\Core\Container;
use App\Core\Response;
use App\Core\View;

final class SettingsController
{
  public function index(): void
  {
    Auth::requireLogin();
    $pdo  = Container::get('db');
    $rows = $pdo->query("SELECT key, value FROM settings")->fetchAll();

    $settings = [];
    foreach ($rows as $r) {
      $settings[$r['key']] = $r['value'];
    }

    View::render('admin/settings', [
      'settings' => $settings,
      'user'     => $_SESSION['admin_user'] ?? 'admin',
      'flash'    => (string)($_GET['msg'] ?? ''),
    ]);
  }

  public function save(): void
  {
    Auth::requireLogin();

    $graceHours = (int)($_POST['grace_hours'] ?? 72);

    // Clamp entre 1 y 720 horas (30 días máximo)
    $graceHours = max(1, min(720, $graceHours));

    $pdo  = Container::get('db');
    $stmt = $pdo->prepare(
      "INSERT INTO settings(key, value, updated_at) VALUES('grace_hours', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    );
    $stmt->execute([(string)$graceHours, date('Y-m-d H:i:s')]);

    Response::redirect('/admin/settings?msg=guardado');
  }
}
