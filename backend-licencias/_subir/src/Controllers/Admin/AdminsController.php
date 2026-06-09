<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Auth;
use App\Core\Container;
use App\Core\Response;
use App\Core\View;

final class AdminsController
{
  // ─── Listar admins ──────────────────────────────────────────────────────

  public function index(): void
  {
    Auth::requireLogin();
    $pdo    = Container::get('db');
    $admins = $pdo->query("SELECT id, username, created_at FROM admin_users ORDER BY id ASC")->fetchAll();

    View::render('admin/admins', [
      'admins'  => $admins,
      'user'    => $_SESSION['admin_user'] ?? 'admin',
      'flash'   => (string)($_GET['msg'] ?? ''),
      'current' => $_SESSION['admin_user'] ?? '',
    ]);
  }

  // ─── Crear admin ────────────────────────────────────────────────────────

  public function create(): void
  {
    Auth::requireLogin();
    $username = trim((string)($_POST['username'] ?? ''));
    $password = (string)($_POST['password'] ?? '');

    if ($username === '' || strlen($password) < 6) {
      Response::redirect('/admin/admins?msg=datos_invalidos');
      return;
    }

    $pdo = Container::get('db');
    try {
      $stmt = $pdo->prepare("INSERT INTO admin_users(username, password_hash, created_at) VALUES(?,?,?)");
      $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), date('Y-m-d H:i:s')]);
      Response::redirect('/admin/admins?msg=admin_creado');
    } catch (\Throwable) {
      Response::redirect('/admin/admins?msg=usuario_duplicado');
    }
  }

  // ─── Cambiar contraseña ─────────────────────────────────────────────────

  public function changePassword(): void
  {
    Auth::requireLogin();
    $id       = (int)($_POST['id']       ?? 0);
    $password = (string)($_POST['password'] ?? '');

    if ($id <= 0 || strlen($password) < 6) {
      Response::redirect('/admin/admins?msg=datos_invalidos');
      return;
    }

    $pdo  = Container::get('db');
    $stmt = $pdo->prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?");
    $stmt->execute([password_hash($password, PASSWORD_DEFAULT), $id]);

    Response::redirect('/admin/admins?msg=password_actualizado');
  }

  // ─── Eliminar admin ─────────────────────────────────────────────────────

  public function delete(): void
  {
    Auth::requireLogin();
    $id      = (int)($_POST['id'] ?? 0);
    $current = $_SESSION['admin_user'] ?? '';

    if ($id <= 0) {
      Response::redirect('/admin/admins');
      return;
    }

    $pdo = Container::get('db');

    // No permitir que se elimine a sí mismo
    $row = $pdo->prepare("SELECT username FROM admin_users WHERE id = ? LIMIT 1");
    $row->execute([$id]);
    $target = $row->fetch();

    if ($target && $target['username'] === $current) {
      Response::redirect('/admin/admins?msg=no_autoeliminar');
      return;
    }

    // Proteger: no borrar si es el único admin
    $total = (int)$pdo->query("SELECT COUNT(*) FROM admin_users")->fetchColumn();
    if ($total <= 1) {
      Response::redirect('/admin/admins?msg=ultimo_admin');
      return;
    }

    $pdo->prepare("DELETE FROM admin_users WHERE id = ?")->execute([$id]);
    Response::redirect('/admin/admins?msg=admin_eliminado');
  }
}
