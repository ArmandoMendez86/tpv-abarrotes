<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Licencias · Dispositivo #<?= (int)$device['id'] ?></title>
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
      .btn-success { background:#14532d; border-color:#166534; }
      .btn-success:hover { background:#166534; }
      .btn-primary { background:#312e81; border-color:#3730a3; }
      .btn-primary:hover { background:#3730a3; }
      .btn-sm { padding:6px 10px; font-size:12px; border-radius:8px; }

      .page { max-width:960px; margin:0 auto; padding:24px; display:flex; flex-direction:column; gap:24px; }

      .back { display:inline-flex; align-items:center; gap:6px; color:#b8c0d9; font-size:13px; }
      .back:hover { color:#eef2ff; }

      /* Flash */
      .flash { padding:10px 16px; border-radius:10px; font-size:13px; font-weight:600; }
      .flash-ok  { background:#0b2a1b; color:#86efac; border:1px solid #14532d; }
      .flash-err { background:#2a1020; color:#fecaca; border:1px solid #7f1d1d; }

      /* Card */
      .card { background:#0f1628; border:1px solid #25304a; border-radius:16px; padding:20px 24px; }
      .card-title { font-size:13px; color:#b8c0d9; text-transform:uppercase; letter-spacing:.08em; font-weight:700; margin:0 0 16px; }

      /* Info grid */
      .info-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:12px 24px; }
      .info-item label { font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:.06em; display:block; margin-bottom:3px; }
      .info-item span  { font-size:13px; color:#eef2ff; word-break:break-all; }
      .mono { font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:12px; color:#c7d2fe; }

      .pill { display:inline-block; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:800; letter-spacing:.06em; }
      .pill-on  { background:#0b2a1b; color:#86efac; border:1px solid #14532d; }
      .pill-off { background:#2a1020; color:#fecaca; border:1px solid #7f1d1d; }
      .pill-exp { background:#422006; color:#fde68a; border:1px solid #92400e; }

      /* Forms side by side */
      .forms-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
      @media(max-width:640px) { .forms-row { grid-template-columns:1fr; } }

      textarea { width:100%; min-height:90px; padding:10px 12px; border-radius:10px; border:1px solid #2a3550; background:#0b1220; color:#eef2ff; font-size:13px; font-family:inherit; resize:vertical; outline:none; margin-bottom:10px; }
      textarea:focus { border-color:#6366f1; }
      input[type="datetime-local"] { width:100%; padding:9px 12px; border-radius:10px; border:1px solid #2a3550; background:#0b1220; color:#eef2ff; font-size:13px; outline:none; margin-bottom:10px; color-scheme:dark; }
      input[type="datetime-local"]:focus { border-color:#6366f1; }
      .form-hint { font-size:11px; color:#64748b; margin-bottom:10px; display:block; }

      /* Toggle en detalle */
      .toggle-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:12px; }

      /* Historial */
      table { width:100%; border-collapse:collapse; font-size:12px; }
      th, td { padding:9px 10px; border-bottom:1px solid #1d263c; text-align:left; vertical-align:middle; }
      th { color:#b8c0d9; text-transform:uppercase; letter-spacing:.06em; font-size:11px; background:#0b1220; }
      tr:last-child td { border-bottom:none; }
      tr:hover td { background:#0e1830; }
      .ok-yes { color:#86efac; font-weight:700; }
      .ok-no  { color:#fca5a5; font-weight:700; }
      .ip-col { font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color:#94a3b8; }

      /* Danger zone */
      .danger-zone { border-color:#7f1d1d; }
      .danger-title { color:#fca5a5; }
      .danger-desc  { font-size:13px; color:#94a3b8; margin:0 0 14px; }

      .empty-hist { text-align:center; padding:32px; color:#64748b; font-size:13px; }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>Detalle del dispositivo</h1>
        <div class="sub">Sesión: <?= htmlspecialchars((string)$user, ENT_QUOTES, 'UTF-8') ?></div>
      </div>
      <a href="/admin" class="btn">← Dashboard</a>
    </header>

    <div class="page">

      <!-- Flash -->
      <?php if ($flash !== '') :
        $msgs = [
          'nota_guardada'       => ['ok', 'Nota guardada correctamente.'],
          'expiracion_guardada' => ['ok', 'Fecha de expiración actualizada.'],
          'estado_actualizado'  => ['ok', 'Estado del dispositivo actualizado.'],
        ];
        $m = $msgs[$flash] ?? null;
      ?>
        <?php if ($m) : ?>
          <div class="flash flash-<?= $m[0] ?>"><?= htmlspecialchars($m[1], ENT_QUOTES, 'UTF-8') ?></div>
        <?php endif; ?>
      <?php endif; ?>

      <!-- Info del dispositivo -->
      <?php
        $now       = date('Y-m-d H:i:s');
        $isExpired = !empty($device['expires_at']) && $device['expires_at'] < $now;
        $isActive  = (int)$device['active'] === 1 && !$isExpired;
      ?>
      <div class="card">
        <p class="card-title">Información del dispositivo</p>
        <div class="info-grid">
          <div class="info-item">
            <label>Estado</label>
            <?php if ($isExpired) : ?>
              <span class="pill pill-exp">EXPIRADA</span>
            <?php elseif ($isActive) : ?>
              <span class="pill pill-on">ACTIVA</span>
            <?php else : ?>
              <span class="pill pill-off">BLOQUEADA</span>
            <?php endif; ?>
          </div>
          <div class="info-item">
            <label>Nombre</label>
            <span><?= htmlspecialchars((string)($device['device_name'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></span>
          </div>
          <div class="info-item" style="grid-column:1/-1">
            <label>ID del dispositivo</label>
            <span class="mono"><?= htmlspecialchars((string)$device['device_id'], ENT_QUOTES, 'UTF-8') ?></span>
          </div>
          <div class="info-item">
            <label>Último usuario</label>
            <span><?= htmlspecialchars((string)($device['last_username'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></span>
          </div>
          <div class="info-item">
            <label>Plataforma</label>
            <span><?= htmlspecialchars((string)($device['last_platform'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></span>
          </div>
          <div class="info-item">
            <label>Versión de la app</label>
            <span><?= htmlspecialchars((string)($device['last_app_version'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></span>
          </div>
          <div class="info-item">
            <label>Última conexión</label>
            <span><?= htmlspecialchars((string)($device['last_seen_at'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></span>
          </div>
          <div class="info-item">
            <label>Registrado el</label>
            <span><?= htmlspecialchars((string)($device['created_at'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></span>
          </div>
        </div>

        <!-- Toggle desde detalle -->
        <div class="toggle-row">
          <?php if ($isActive) : ?>
            <form method="post" action="/admin/device/toggle">
              <input type="hidden" name="id"   value="<?= (int)$device['id'] ?>" />
              <input type="hidden" name="next"  value="0" />
              <input type="hidden" name="from"  value="detail" />
              <button class="btn btn-danger" type="submit">Bloquear licencia</button>
            </form>
          <?php else : ?>
            <form method="post" action="/admin/device/toggle">
              <input type="hidden" name="id"   value="<?= (int)$device['id'] ?>" />
              <input type="hidden" name="next"  value="1" />
              <input type="hidden" name="from"  value="detail" />
              <button class="btn btn-success" type="submit">Activar licencia</button>
            </form>
          <?php endif; ?>
        </div>
      </div>

      <!-- Nota + Expiración -->
      <div class="forms-row">

        <!-- Nota -->
        <div class="card">
          <p class="card-title">Nota interna</p>
          <form method="post" action="/admin/device/note">
            <input type="hidden" name="id" value="<?= (int)$device['id'] ?>" />
            <span class="form-hint">Visible solo en el dashboard. Útil para anotar cliente, estado de pago, etc.</span>
            <textarea name="notes" placeholder="Ej: Cliente Juan García, pago pendiente…"><?= htmlspecialchars((string)($device['notes'] ?? ''), ENT_QUOTES, 'UTF-8') ?></textarea>
            <button class="btn btn-primary" type="submit">Guardar nota</button>
          </form>
        </div>

        <!-- Expiración -->
        <div class="card">
          <p class="card-title">Fecha de expiración</p>
          <form method="post" action="/admin/device/expiry">
            <input type="hidden" name="id" value="<?= (int)$device['id'] ?>" />
            <span class="form-hint">La app recibirá <code>inactive</code> automáticamente al pasar esta fecha. Dejar vacío = sin límite.</span>
            <?php
              $expiryVal = '';
              if (!empty($device['expires_at'])) {
                // datetime-local espera "YYYY-MM-DDTHH:MM"
                $expiryVal = substr(str_replace(' ', 'T', (string)$device['expires_at']), 0, 16);
              }
            ?>
            <input
              type="datetime-local"
              name="expires_at"
              value="<?= htmlspecialchars($expiryVal, ENT_QUOTES, 'UTF-8') ?>"
            />
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn btn-primary" type="submit">Guardar expiración</button>
              <button class="btn" type="submit" name="expires_at" value=""
                onclick="this.form.querySelector('[name=expires_at]').value=''"
              >Sin límite</button>
            </div>
          </form>
        </div>

      </div>

      <!-- Historial de verificaciones -->
      <div class="card">
        <p class="card-title">Historial de verificaciones (últimas 50)</p>
        <?php if (empty($history)) : ?>
          <div class="empty-hist">Sin registros de verificación para este dispositivo.</div>
        <?php else : ?>
          <table>
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Resultado</th>
                <th>Mensaje</th>
                <th>IP</th>
                <th>Usuario</th>
                <th>Versión</th>
              </tr>
            </thead>
            <tbody>
            <?php foreach ($history as $h) : ?>
              <tr>
                <td><?= htmlspecialchars((string)($h['created_at'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></td>
                <td>
                  <?php if ((int)$h['ok'] === 1) : ?>
                    <span class="ok-yes">✓ OK</span>
                  <?php else : ?>
                    <span class="ok-no">✗ Denegado</span>
                  <?php endif; ?>
                </td>
                <td><?= htmlspecialchars((string)($h['message'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></td>
                <td class="ip-col"><?= htmlspecialchars((string)($h['ip'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></td>
                <td><?= htmlspecialchars((string)($h['username'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></td>
                <td><?= htmlspecialchars((string)($h['app_version'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></td>
              </tr>
            <?php endforeach; ?>
            </tbody>
          </table>
        <?php endif; ?>
      </div>

      <!-- Zona de peligro -->
      <div class="card danger-zone">
        <p class="card-title danger-title">Zona de peligro</p>
        <p class="danger-desc">
          Eliminar el dispositivo borra permanentemente su registro y todo el historial de verificaciones.
          Esta acción <strong>no se puede deshacer</strong>.
        </p>
        <form method="post" action="/admin/device/delete"
          onsubmit="return confirm('¿Estás seguro? Se eliminará el dispositivo y todo su historial de forma permanente.')">
          <input type="hidden" name="id" value="<?= (int)$device['id'] ?>" />
          <button class="btn btn-danger" type="submit">Eliminar dispositivo</button>
        </form>
      </div>

    </div>
  </body>
</html>
