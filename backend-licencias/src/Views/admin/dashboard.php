<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Licencias · Dashboard</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#0b1220; color:#eef2ff; margin:0; }
      header { padding: 18px 20px; border-bottom: 1px solid #25304a; display:flex; justify-content: space-between; align-items:center; background:#0f1628; position: sticky; top:0; }
      h1 { font-size: 18px; margin:0; }
      .sub { color:#b8c0d9; font-size: 12px; }
      .btn { padding: 10px 12px; border-radius: 12px; border:1px solid #2a3550; background:#121a2c; color:#eef2ff; cursor:pointer; }
      .wrap { padding: 16px 20px; }
      table { width:100%; border-collapse: collapse; overflow:hidden; border-radius: 14px; border:1px solid #25304a; }
      th, td { padding: 12px 10px; border-bottom:1px solid #1d263c; vertical-align: top; }
      th { text-align:left; font-size: 12px; color:#b8c0d9; text-transform: uppercase; letter-spacing: .08em; background:#121a2c; }
      tr:hover td { background:#0f1628; }
      .pill { display:inline-block; padding: 4px 10px; border-radius:999px; font-size: 12px; font-weight: 900; letter-spacing: .08em; }
      .on { background:#0b2a1b; color:#86efac; border:1px solid #14532d; }
      .off { background:#2a1020; color:#fecaca; border:1px solid #7f1d1d; }
      .small { color:#b8c0d9; font-size: 12px; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color:#c7d2fe; }
      .actions { display:flex; gap: 8px; }
      .danger { background:#7f1d1d; border-color:#7f1d1d; }
      .success { background:#14532d; border-color:#14532d; }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>Licencias</h1>
        <div class="sub">Sesión: <?php echo htmlspecialchars((string)$user, ENT_QUOTES, 'UTF-8'); ?></div>
      </div>
      <form method="post" action="/admin/logout">
        <button class="btn" type="submit">Salir</button>
      </form>
    </header>

    <div class="wrap">
      <table>
        <thead>
          <tr>
            <th>Estado</th>
            <th>Device</th>
            <th>Último usuario</th>
            <th>Plataforma</th>
            <th>Versión</th>
            <th>Última conexión</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
        <?php foreach ($devices as $d) : ?>
          <tr>
            <td>
              <?php if ((int)$d['active'] === 1) : ?>
                <span class="pill on">ACTIVA</span>
              <?php else : ?>
                <span class="pill off">BLOQUEADA</span>
              <?php endif; ?>
            </td>
            <td>
              <div class="mono"><?php echo htmlspecialchars((string)$d['device_id'], ENT_QUOTES, 'UTF-8'); ?></div>
              <div class="small"><?php echo htmlspecialchars((string)($d['device_name'] ?? '—'), ENT_QUOTES, 'UTF-8'); ?></div>
            </td>
            <td class="small"><?php echo htmlspecialchars((string)($d['last_username'] ?? '—'), ENT_QUOTES, 'UTF-8'); ?></td>
            <td class="small"><?php echo htmlspecialchars((string)($d['last_platform'] ?? '—'), ENT_QUOTES, 'UTF-8'); ?></td>
            <td class="small"><?php echo htmlspecialchars((string)($d['last_app_version'] ?? '—'), ENT_QUOTES, 'UTF-8'); ?></td>
            <td class="small"><?php echo htmlspecialchars((string)($d['last_seen_at'] ?? '—'), ENT_QUOTES, 'UTF-8'); ?></td>
            <td>
              <div class="actions">
                <?php if ((int)$d['active'] === 1) : ?>
                  <form method="post" action="/admin/device/toggle">
                    <input type="hidden" name="id" value="<?php echo (int)$d['id']; ?>" />
                    <input type="hidden" name="next" value="0" />
                    <button class="btn danger" type="submit">Bloquear</button>
                  </form>
                <?php else : ?>
                  <form method="post" action="/admin/device/toggle">
                    <input type="hidden" name="id" value="<?php echo (int)$d['id']; ?>" />
                    <input type="hidden" name="next" value="1" />
                    <button class="btn success" type="submit">Activar</button>
                  </form>
                <?php endif; ?>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </body>
</html>

