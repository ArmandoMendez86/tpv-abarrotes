<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Licencias · Login</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#0b1220; color:#eef2ff; margin:0; }
      .wrap { max-width: 420px; margin: 64px auto; padding: 24px; background:#121a2c; border:1px solid #25304a; border-radius: 16px; }
      h1 { margin: 0 0 8px; font-size: 22px; }
      p { margin: 0 0 16px; color:#b8c0d9; }
      label { display:block; margin: 12px 0 6px; color:#b8c0d9; font-size: 12px; text-transform: uppercase; letter-spacing: .08em;}
      input { width:100%; padding: 12px 12px; border-radius: 12px; border:1px solid #2a3550; background:#0f1628; color:#eef2ff; font-size: 16px; }
      button { margin-top: 16px; width:100%; padding: 12px; border-radius: 12px; border:0; background:#2563eb; color:white; font-weight:800; font-size: 16px; cursor:pointer; }
      .err { margin-top: 12px; background:#2a1020; border:1px solid #7f1d1d; color:#fecaca; padding: 10px 12px; border-radius: 12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Dashboard de licencias</h1>
      <p>Inicia sesión para activar o bloquear dispositivos.</p>

      <form method="post" action="/admin/login">
        <label>Usuario</label>
        <input name="username" autocomplete="username" />
        <label>Contraseña</label>
        <input type="password" name="password" autocomplete="current-password" />
        <button type="submit">Entrar</button>
      </form>

      <?php if (!empty($error)) : ?>
        <div class="err"><?php echo htmlspecialchars((string)$error, ENT_QUOTES, 'UTF-8'); ?></div>
      <?php endif; ?>
    </div>
  </body>
</html>

