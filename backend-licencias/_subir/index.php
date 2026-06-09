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

$router->get('/admin',                  [App\Controllers\Admin\DashboardController::class, 'index']);
$router->get('/admin/device/detail',    [App\Controllers\Admin\DashboardController::class, 'detailDevice']);
$router->post('/admin/device/toggle',   [App\Controllers\Admin\DashboardController::class, 'toggleDevice']);
$router->post('/admin/device/note',     [App\Controllers\Admin\DashboardController::class, 'noteDevice']);
$router->post('/admin/device/expiry',   [App\Controllers\Admin\DashboardController::class, 'expiryDevice']);
$router->post('/admin/device/delete',   [App\Controllers\Admin\DashboardController::class, 'deleteDevice']);

// Exportar y bulk
$router->get('/admin/export/csv',    [App\Controllers\Admin\ExportController::class, 'csv']);
$router->post('/admin/device/bulk',  [App\Controllers\Admin\ExportController::class, 'bulk']);

// Configuración global
$router->get('/admin/settings',  [App\Controllers\Admin\SettingsController::class, 'index']);
$router->post('/admin/settings', [App\Controllers\Admin\SettingsController::class, 'save']);

// Gestión de administradores
$router->get('/admin/admins',                [App\Controllers\Admin\AdminsController::class, 'index']);
$router->post('/admin/admins/create',        [App\Controllers\Admin\AdminsController::class, 'create']);
$router->post('/admin/admins/password',      [App\Controllers\Admin\AdminsController::class, 'changePassword']);
$router->post('/admin/admins/delete',        [App\Controllers\Admin\AdminsController::class, 'delete']);

$router->dispatch();

