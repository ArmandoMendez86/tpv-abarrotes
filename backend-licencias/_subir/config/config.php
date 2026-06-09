<?php
declare(strict_types=1);

return [
  'db' => [
    'sqlite_path' => __DIR__ . '/../data/licensing.sqlite',
  ],
  // Clave que manda la app React Native en cada verificación de licencia.
  'api_key' => 'PVT-1F30A7871FF7F23F46541DF707311C4BE7073859',

  // Sal para firmar las sesiones del dashboard admin.
  'session_secret' => '045cc1543b66e82b1e2bdac43315a257b4aff5ed8dd035556420279aacbfa731249c2c5e2bbfac93',
];
