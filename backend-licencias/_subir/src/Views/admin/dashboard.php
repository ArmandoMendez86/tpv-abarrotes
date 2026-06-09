<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Licencias · Dashboard</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#0b1220; color:#eef2ff; margin:0; }
      a { color:#818cf8; text-decoration:none; }
      a:hover { text-decoration:underline; }

      /* Header */
      header { padding:16px 24px; border-bottom:1px solid #25304a; display:flex; justify-content:space-between; align-items:center; background:#0f1628; position:sticky; top:0; z-index:10; gap:12px; flex-wrap:wrap; }
      h1 { font-size:18px; margin:0; }
      .sub { color:#b8c0d9; font-size:12px; margin-top:2px; }

      /* Botones */
      .btn { padding:9px 14px; border-radius:10px; border:1px solid #2a3550; background:#121a2c; color:#eef2ff; cursor:pointer; font-size:13px; font-weight:600; display:inline-flex; align-items:center; gap:6px; white-space:nowrap; }
      .btn:hover { background:#1a2540; }
      .btn-danger  { background:#7f1d1d; border-color:#991b1b; }
      .btn-danger:hover { background:#991b1b; }
      .btn-success { background:#14532d; border-color:#166534; }
      .btn-success:hover { background:#166534; }
      .btn-primary { background:#312e81; border-color:#3730a3; }
      .btn-primary:hover { background:#3730a3; }
      .btn-sm { padding:6px 10px; font-size:12px; border-radius:8px; }

      /* Stats */
      .stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px; padding:20px 24px 0; }
      .stat-card { background:#0f1628; border:1px solid #25304a; border-radius:14px; padding:16px 18px; }
      .stat-label { font-size:11px; color:#b8c0d9; text-transform:uppercase; letter-spacing:.08em; margin-bottom:6px; }
      .stat-value { font-size:28px; font-weight:800; line-height:1; }
      .c-green  { color:#86efac; }
      .c-red    { color:#fca5a5; }
      .c-blue   { color:#a5b4fc; }
      .c-yellow { color:#fde68a; }

      /* Toolbar */
      .toolbar { display:flex; gap:10px; align-items:center; padding:16px 24px; flex-wrap:wrap; }
      .search-input { flex:1; min-width:180px; padding:9px 12px; border-radius:10px; border:1px solid #2a3550; background:#121a2c; color:#eef2ff; font-size:13px; outline:none; }
      .search-input:focus { border-color:#6366f1; }
      .filter-tabs { display:flex; gap:6px; }
      .ftab { padding:8px 14px; border-radius:10px; border:1px solid #2a3550; background:#121a2c; color:#b8c0d9; cursor:pointer; font-size:12px; font-weight:600; }
      .ftab.active, .ftab:hover { background:#1e2d4a; color:#eef2ff; border-color:#6366f1; }
      .count-badge { font-size:11px; background:#25304a; padding:2px 7px; border-radius:999px; margin-left:4px; }

      /* Flash */
      .flash { margin:0 24px 0; padding:10px 16px; border-radius:10px; font-size:13px; font-weight:600; }
      .flash-ok  { background:#0b2a1b; color:#86efac; border:1px solid #14532d; }
      .flash-err { background:#2a1020; color:#fecaca; border:1px solid #7f1d1d; }

      /* Tabla */
      .wrap { padding:12px 24px 40px; }
      table { width:100%; border-collapse:collapse; border-radius:14px; border:1px solid #25304a; overflow:hidden; }
      th, td { padding:11px 12px; border-bottom:1px solid #1d263c; vertical-align:middle; }
      th { text-align:left; font-size:11px; color:#b8c0d9; text-transform:uppercase; letter-spacing:.08em; background:#121a2c; white-space:nowrap; }
      tr:last-child td { border-bottom:none; }
      tr:hover td { background:#0e1830; }

      .pill { display:inline-block; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:800; letter-spacing:.06em; white-space:nowrap; }
      .pill-on  { background:#0b2a1b; color:#86efac; border:1px solid #14532d; }
      .pill-off { background:#2a1020; color:#fecaca; border:1px solid #7f1d1d; }
      .pill-exp { background:#422006; color:#fde68a; border:1px solid #92400e; }

      .mono  { font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:11px; color:#c7d2fe; }
      .small { color:#b8c0d9; font-size:12px; }
      .muted { color:#64748b; font-size:11px; }
      .note-snippet { max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; color:#94a3b8; font-style:italic; }
      .actions { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }

      .empty { text-align:center; padding:60px 20px; color:#64748b; }
      .empty strong { display:block; font-size:16px; margin-bottom:8px; color:#b8c0d9; }

      /* Bulk actions bar */
      .bulk-bar { display:flex; gap:10px; align-items:center; padding:10px 24px 0; flex-wrap:wrap; }
      .bulk-select { padding:8px 12px; border-radius:10px; border:1px solid #2a3550; background:#121a2c; color:#eef2ff; font-size:13px; outline:none; cursor:pointer; }
      .bulk-select:focus { border-color:#6366f1; }
      input[type="checkbox"] { width:15px; height:15px; cursor:pointer; accent-color:#6366f1; }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>Licencias</h1>
        <div class="sub">Sesión: <?= htmlspecialchars((string)$user, ENT_QUOTES, 'UTF-8') ?></div>
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <a href="/admin/settings" class="btn btn-sm">Configuración</a>
        <a href="/admin/admins" class="btn btn-sm">Administradores</a>
        <form method="post" action="/admin/logout">
          <button class="btn" type="submit">Salir</button>
        </form>
      </div>
    </header>

    <!-- Stats -->
    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Total dispositivos</div>
        <div class="stat-value c-blue"><?= (int)($stats['total'] ?? 0) ?></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Activos</div>
        <div class="stat-value c-green"><?= (int)($stats['activos'] ?? 0) ?></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Bloqueados</div>
        <div class="stat-value c-red"><?= (int)($stats['bloqueados'] ?? 0) ?></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Verificaciones hoy</div>
        <div class="stat-value c-yellow"><?= (int)$checksHoy ?></div>
      </div>
    </div>

    <!-- Toolbar: búsqueda + filtros -->
    <form method="get" action="/admin" class="toolbar">
      <input
        class="search-input"
        type="text"
        name="q"
        value="<?= htmlspecialchars($q, ENT_QUOTES, 'UTF-8') ?>"
        placeholder="Buscar por nombre, usuario o ID…"
      />
      <div class="filter-tabs">
        <button type="submit" name="status" value="all"
          class="ftab <?= $status === 'all' ? 'active' : '' ?>">
          Todos
        </button>
        <button type="submit" name="status" value="active"
          class="ftab <?= $status === 'active' ? 'active' : '' ?>">
          Activos
        </button>
        <button type="submit" name="status" value="inactive"
          class="ftab <?= $status === 'inactive' ? 'active' : '' ?>">
          Bloqueados
        </button>
      </div>
      <?php if ($q !== '') : ?>
        <a href="/admin" class="btn btn-sm">✕ Limpiar</a>
      <?php endif; ?>
    </form>

    <!-- Barra bulk + exportar -->
    <form method="post" action="/admin/device/bulk" id="bulk-form">
    <div class="bulk-bar">
      <select name="bulk_action" class="bulk-select">
        <option value="">Acción masiva…</option>
        <option value="activate">Activar seleccionados</option>
        <option value="block">Bloquear seleccionados</option>
        <option value="delete">Eliminar seleccionados</option>
      </select>
      <button type="submit" class="btn btn-sm btn-primary"
        onclick="
          var sel = document.querySelectorAll('.cb-device:checked');
          if (sel.length === 0) { alert('Selecciona al menos un dispositivo.'); return false; }
          var act = document.querySelector('[name=bulk_action]').value;
          if (!act) { alert('Elige una acción.'); return false; }
          if (act === 'delete') return confirm('¿Eliminar ' + sel.length + ' dispositivo(s) y su historial?');
          return true;
        ">
        Aplicar
      </button>
      <a href="/admin/export/csv" class="btn btn-sm">Exportar CSV</a>
    </div>

    <!-- Flash -->
    <?php if ($flash !== '') : ?>
      <?php $msgs = [
        'dispositivo_eliminado' => ['ok',  'Dispositivo eliminado correctamente.'],
        'bulk_ok'               => ['ok',  'Acción masiva aplicada correctamente.'],
        'bulk_invalid'          => ['err', 'Selecciona dispositivos y una acción válida.'],
      ]; $m = $msgs[$flash] ?? null; ?>
      <?php if ($m) : ?>
        <div class="flash flash-<?= $m[0] ?>" style="margin-bottom:0;">
          <?= htmlspecialchars($m[1], ENT_QUOTES, 'UTF-8') ?>
        </div>
      <?php endif; ?>
    <?php endif; ?>

    <div class="wrap">
      <?php $now = date('Y-m-d H:i:s'); ?>
      <table>
        <thead>
          <tr>
            <th style="width:36px;">
              <input type="checkbox" id="check-all" title="Seleccionar todos"
                onclick="document.querySelectorAll('.cb-device').forEach(c => c.checked = this.checked)" />
            </th>
            <th>Estado</th>
            <th>Dispositivo</th>
            <th>Último usuario</th>
            <th>Última conexión</th>
            <th>Expira</th>
            <th>Nota</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
        <?php if (empty($devices)) : ?>
          <tr><td colspan="8">
            <div class="empty">
              <strong>Sin resultados</strong>
              <?= $q !== '' ? 'No hay dispositivos que coincidan con la búsqueda.' : 'Aún no se ha registrado ningún dispositivo.' ?>
            </div>
          </td></tr>
        <?php endif; ?>
        <?php foreach ($devices as $d) :
          $isExpired = !empty($d['expires_at']) && $d['expires_at'] < $now;
          $isActive  = (int)$d['active'] === 1 && !$isExpired;
        ?>
          <tr>
            <td style="width:36px;">
              <input type="checkbox" class="cb-device" name="ids[]" value="<?= (int)$d['id'] ?>" />
            </td>
            <td>
              <?php if ($isExpired) : ?>
                <span class="pill pill-exp">EXPIRADA</span>
              <?php elseif ($isActive) : ?>
                <span class="pill pill-on">ACTIVA</span>
              <?php else : ?>
                <span class="pill pill-off">BLOQUEADA</span>
              <?php endif; ?>
            </td>
            <td>
              <div class="mono"><?= htmlspecialchars((string)$d['device_id'], ENT_QUOTES, 'UTF-8') ?></div>
              <div class="small"><?= htmlspecialchars((string)($d['device_name'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></div>
              <div class="muted"><?= htmlspecialchars((string)($d['last_platform'] ?? ''), ENT_QUOTES, 'UTF-8') ?>
                <?= !empty($d['last_app_version']) ? 'v' . htmlspecialchars((string)$d['last_app_version'], ENT_QUOTES, 'UTF-8') : '' ?>
              </div>
            </td>
            <td class="small"><?= htmlspecialchars((string)($d['last_username'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></td>
            <td class="small"><?= htmlspecialchars((string)($d['last_seen_at'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></td>
            <td class="small">
              <?php if (!empty($d['expires_at'])) : ?>
                <span class="<?= $isExpired ? 'c-yellow' : '' ?>">
                  <?= htmlspecialchars((string)$d['expires_at'], ENT_QUOTES, 'UTF-8') ?>
                </span>
              <?php else : ?>
                <span class="muted">Sin límite</span>
              <?php endif; ?>
            </td>
            <td>
              <?php if (!empty($d['notes'])) : ?>
                <span class="note-snippet" title="<?= htmlspecialchars((string)$d['notes'], ENT_QUOTES, 'UTF-8') ?>">
                  <?= htmlspecialchars((string)$d['notes'], ENT_QUOTES, 'UTF-8') ?>
                </span>
              <?php else : ?>
                <span class="muted">—</span>
              <?php endif; ?>
            </td>
            <td>
              <div class="actions">
                <!-- Detalle -->
                <a href="/admin/device/detail?id=<?= (int)$d['id'] ?>" class="btn btn-sm btn-primary">Detalle</a>

                <!-- Toggle -->
                <?php if ($isActive) : ?>
                  <form method="post" action="/admin/device/toggle">
                    <input type="hidden" name="id"   value="<?= (int)$d['id'] ?>" />
                    <input type="hidden" name="next"  value="0" />
                    <button class="btn btn-sm btn-danger" type="submit">Bloquear</button>
                  </form>
                <?php else : ?>
                  <form method="post" action="/admin/device/toggle">
                    <input type="hidden" name="id"   value="<?= (int)$d['id'] ?>" />
                    <input type="hidden" name="next"  value="1" />
                    <button class="btn btn-sm btn-success" type="submit">Activar</button>
                  </form>
                <?php endif; ?>

                <!-- Eliminar -->
                <form method="post" action="/admin/device/delete"
                  onsubmit="return confirm('¿Eliminar este dispositivo y todo su historial? Esta acción no se puede deshacer.')">
                  <input type="hidden" name="id" value="<?= (int)$d['id'] ?>" />
                  <button class="btn btn-sm btn-danger" type="submit">Eliminar</button>
                </form>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    </form><!-- /bulk-form -->
  </body>
</html>
