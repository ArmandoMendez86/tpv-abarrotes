<?php
declare(strict_types=1);

namespace App\Core;

final class Auth
{
  public static function check(): bool
  {
    return isset($_SESSION['admin_user']);
  }

  public static function requireLogin(): void
  {
    if (!self::check()) {
      Response::redirect('/admin/login');
    }
  }

  public static function login(string $username): void
  {
    $_SESSION['admin_user'] = $username;
  }

  public static function logout(): void
  {
    unset($_SESSION['admin_user']);
  }
}

