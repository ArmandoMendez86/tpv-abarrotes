<?php
declare(strict_types=1);

return [
  'db' => [
    // Ruta del archivo SQLite. Recomendado: fuera del document root.
    // Ejemplo Hostinger: /home/USER/licensing.sqlite
    // Ejemplo local: __DIR__ . '/../data/licensing.sqlite'
    'sqlite_path' => __DIR__ . '/../data/licensing.sqlite',
  ],
  // Clave que manda la app. Cambiarla y mantenerla igual en RN (`licenseClient.ts`).
  'api_key' => 'PVT_DEMO_KEY',

  // Sal para firmar sesiones (dashboard). Cambiarla.
  'session_secret' => 'CAMBIA_ESTA_SAL_LARGA',
];

