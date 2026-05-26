<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Auth;
use App\Core\Container;
use App\Core\Response;
use App\Core\View;

final class AuthController
{
  public function loginForm(): void
  {
    View::render('admin/login', ['error' => null]);
  }

  public function login(): void
  {
    $username = trim((string)($_POST['username'] ?? ''));
    $password = (string)($_POST['password'] ?? '');

    $pdo = Container::get('db');
    $stmt = $pdo->prepare("SELECT username, password_hash FROM admin_users WHERE username = ? LIMIT 1");
    $stmt->execute([$username]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($password, (string)$row['password_hash'])) {
      View::render('admin/login', ['error' => 'Credenciales inválidas.']);
      return;
    }

    Auth::login($username);
    Response::redirect('/admin');
  }

  public function logout(): void
  {
    Auth::logout();
    Response::redirect('/admin/login');
  }
}

