<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Licencias · Administradores</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body { font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#0b1220; color:#eef2ff; margin:0; }
      a { color:#818cf8; text-decoration:none; }
      a:hover { text-decoration:underline; }

      header { padding:16px 24px; border-bottom:1px solid #25304a; display:flex; justify-content:space-between; align-items:center; background:#0f1628; position:sticky; top:0; z-index:10; gap:12px; flex-wrap:wrap; }
      h1 { font-size:18px; margin:0; }
      .sub { color:#b8c0d9; font-size:12px; margin-top:2px; }

      .btn { padding:9px 14px; border-radius:10px; border:1px solid #2a3550; background:#121a2c; color:#eef2ff; cursor:pointer; font-size:13px; font-weight:600; display:inline-flex; align-items:center; gap:6px; white-space:nowrap; }
      .btn:hover { background:#1a2540; }
      .btn-danger  { background:#7f1d1d; border-color:#991b1b; }
      .btn-danger:hover { background:#991b1b; }
      .btn-primary { background:#312e81; border-color:#3730a3; }
      .btn-primary:hover { background:#3730a3; }
      .btn-sm { padding:6px 10px; font-size:12px; border-radius:8px; }

      .page { max-width:860px; margin:0 auto; padding:24px; display:flex; flex-direction:column; gap:20px; }

      .flash { padding:10px 16px; border-radius:10px; font-size:13px; font-weight:600; }
      .flash-ok  { background:#0b2a1b; color:#86efac; border:1px solid #14532d; }
      .flash-err { background:#2a1020; color:#fecaca; border:1px solid #7f1d1d; }

      .card { background:#0f1628; border:1px solid #25304a; border-radius:16px; padding:20px 24px; }
      .card-title { font-size:13px; color:#b8c0d9; text-transform:uppercase; letter-spacing:.08em; font-weight:700; margin:0 0 16px; }

      table { width:100%; border-collapse:collapse; font-size:13px; }
      th, td { padding:10px 12px; border-bottom:1px solid #1d263c; text-align:left; vertical-align:middle; }
      th { font-size:11px; color:#b8c0d9; text-transform:uppercase; letter-spacing:.06em; background:#0b1220; }
      tr:last-child td { border-bottom:none; }
      tr:hover td { background:#0e1830; }

      .form-row { display:grid; grid-template-columns:1fr 1fr auto; gap:10px; align-items:end; flex-wrap:wrap; }
      @media(max-width:560px) { .form-row { grid-template-columns:1fr; } }
      .field { display:flex; flex-direction:column; gap:5px; }
      .field label { font-size:11px; color:#b8c0d9; text-transform:uppercase; letter-spacing:.06em; }
      input[type="text"], input[type="password"] { width:100%; padding:9px 12px; border-radius:10px; border:1px solid #2a3550; background:#0b1220; color:#eef2ff; font-size:13px; outline:none; }
      input:focus { border-color:#6366f1; }

      .you { font-size:11px; color:#6366f1; font-weight:700; margin-left:6px; }

      /* Modal-like inline password change */
      details { margin-top:4px; }
      summary { cursor:pointer; font-size:11px; color:#818cf8; list-style:none; }
      summary::-webkit-details-marker { display:none; }
      .pwd-form { display:flex; gap:8px; align-items:center; margin-top:8px; flex-wrap:wrap; }
      .pwd-form input { width:160px; }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>Administradores</h1>
        <div class="sub">Sesión: <?= htmlspecialchars((string)$user, ENT_QUOTES, 'UTF-8') ?></div>
      </div>
      <a href="/admin" class="btn">← Dashboard</a>
    </header>

    <div class="page">

      <!-- Flash -->
      <?php if ($flash !== '') :
        $msgs = [
          'admin_creado'       => ['ok',  'Administrador creado correctamente.'],
          'admin_eliminado'    => ['ok',  'Administrador eliminado.'],
          'password_actualizado' => ['ok','Contraseña actualizada.'],
          'datos_invalidos'    => ['err', 'Datos inválidos. La contraseña debe tener al menos 6 caracteres.'],
          'usuario_duplicado'  => ['err', 'Ese nombre de usuario ya existe.'],
          'no_autoeliminar'    => ['err', 'No puedes eliminar tu propia cuenta.'],
          'ultimo_admin'       => ['err', 'No puedes eliminar el último administrador.'],
        ];
        $m = $msgs[$flash] ?? null;
      ?>
        <?php if ($m) : ?>
          <div class="flash flash-<?= $m[0] ?>"><?= htmlspecialchars($m[1], ENT_QUOTES, 'UTF-8') ?></div>
        <?php endif; ?>
      <?php endif; ?>

      <!-- Lista de admins -->
      <div class="card">
        <p class="card-title">Administradores activos</p>
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Creado el</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
          <?php foreach ($admins as $a) : ?>
            <tr>
              <td>
                <?= htmlspecialchars((string)$a['username'], ENT_QUOTES, 'UTF-8') ?>
                <?php if ($a['username'] === $current) : ?>
                  <span class="you">Tú</span>
                <?php endif; ?>
              </td>
              <td style="font-size:12px; color:#b8c0d9;">
                <?= htmlspecialchars((string)($a['created_at'] ?? '—'), ENT_QUOTES, 'UTF-8') ?>
              </td>
              <td>
                <!-- Cambiar contraseña (inline expandible) -->
                <details>
                  <summary>Cambiar contraseña</summary>
                  <form method="post" action="/admin/admins/password" class="pwd-form">
                    <input type="hidden" name="id" value="<?= (int)$a['id'] ?>" />
                    <input type="password" name="password" placeholder="Nueva contraseña" minlength="6" required />
                    <button class="btn btn-primary btn-sm" type="submit">Guardar</button>
                  </form>
                </details>

                <!-- Eliminar -->
                <?php if ($a['username'] !== $current) : ?>
                  <form method="post" action="/admin/admins/delete" style="margin-top:6px;"
                    onsubmit="return confirm('¿Eliminar al administrador «<?= htmlspecialchars((string)$a['username'], ENT_JS, 'UTF-8') ?>»?')">
                    <input type="hidden" name="id" value="<?= (int)$a['id'] ?>" />
                    <button class="btn btn-sm btn-danger" type="submit">Eliminar</button>
                  </form>
                <?php endif; ?>
              </td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>

      <!-- Crear nuevo admin -->
      <div class="card">
        <p class="card-title">Crear administrador</p>
        <form method="post" action="/admin/admins/create">
          <div class="form-row">
            <div class="field">
              <label>Nombre de usuario</label>
              <input type="text" name="username" placeholder="Ej: soporte" required />
            </div>
            <div class="field">
              <label>Contraseña (mín. 6 caracteres)</label>
              <input type="password" name="password" minlength="6" required />
            </div>
            <button class="btn btn-primary" type="submit">Crear</button>
          </div>
        </form>
      </div>

    </div>
  </body>
</html>
