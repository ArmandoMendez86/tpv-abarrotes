<?php
declare(strict_types=1);

// Hostinger: a veces NO permite cambiar el document root.
// Este index funciona en ambos casos:
//  - Si está en /public/index.php  -> carga ../src/bootstrap.php
//  - Si está en /public_html/index.php -> carga ./src/bootstrap.php
$bootstrapA = __DIR__ . '/../src/bootstrap.php';
$bootstrapB = __DIR__ . '/src/bootstrap.php';
if (file_exists($bootstrapA)) {
  require_once $bootstrapA;
} elseif (file_exists($bootstrapB)) {
  require_once $bootstrapB;
} else {
  http_response_code(500);
  header('Content-Type: text/plain; charset=utf-8');
  echo "Bootstrap not found. Expected: {$bootstrapA} OR {$bootstrapB}";
  exit;
}

use App\Core\Router;

$router = new Router();

// API
$router->post('/api/v1/license/check', [App\Controllers\Api\LicenseController::class, 'check']);

// Dashboard
$router->get('/admin/login', [App\Controllers\Admin\AuthController::class, 'loginForm']);
$router->post('/admin/login', [App\Controllers\Admin\AuthController::class, 'login']);
$router->post('/admin/logout', [App\Controllers\Admin\AuthController::class, 'logout']);

$router->get('/admin', [App\Controllers\Admin\DashboardController::class, 'index']);
$router->post('/admin/device/toggle', [App\Controllers\Admin\DashboardController::class, 'toggleDevice']);

$router->dispatch();

