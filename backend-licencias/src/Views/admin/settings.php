<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Licencias · Configuración</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body { font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#0b1220; color:#eef2ff; margin:0; }
      a { color:#818cf8; text-decoration:none; }
      a:hover { text-decoration:underline; }

      header { padding:16px 24px; border-bottom:1px solid #25304a; display:flex; justify-content:space-between; align-items:center; background:#0f1628; position:sticky; top:0; z-index:10; gap:12px; flex-wrap:wrap; }
      h1 { font-size:18px; margin:0; }
      .sub { color:#b8c0d9; font-size:12px; margin-top:2px; }

      .btn { padding:9px 14px; border-radius:10px; border:1px solid #2a3550; background:#121a2c; color:#eef2ff; cursor:pointer; font-size:13px; font-weight:600; display:inline-flex; align-items:center; gap:6px; }
      .btn:hover { background:#1a2540; }
      .btn-primary { background:#312e81; border-color:#3730a3; }
      .btn-primary:hover { background:#3730a3; }

      .page { max-width:720px; margin:0 auto; padding:24px; display:flex; flex-direction:column; gap:20px; }

      .flash { padding:10px 16px; border-radius:10px; font-size:13px; font-weight:600; }
      .flash-ok { background:#0b2a1b; color:#86efac; border:1px solid #14532d; }

      .card { background:#0f1628; border:1px solid #25304a; border-radius:16px; padding:24px; }
      .card-title { font-size:13px; color:#b8c0d9; text-transform:uppercase; letter-spacing:.08em; font-weight:700; margin:0 0 6px; }
      .card-desc { font-size:13px; color:#64748b; margin:0 0 20px; line-height:1.6; }

      .field { display:flex; flex-direction:column; gap:8px; margin-bottom:20px; }
      .field label { font-size:12px; color:#b8c0d9; text-transform:uppercase; letter-spacing:.06em; font-weight:700; }
      .field-hint { font-size:12px; color:#64748b; margin-top:2px; }

      .options-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:10px; }
      .opt { position:relative; }
      .opt input[type="radio"] { position:absolute; opacity:0; width:0; height:0; }
      .opt label {
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        padding:14px 10px; border-radius:12px; border:2px solid #25304a;
        background:#0b1220; cursor:pointer; text-align:center; gap:4px;
        transition:border-color .15s, background .15s;
      }
      .opt input[type="radio"]:checked + label {
        border-color:#6366f1; background:#1e1b4b;
      }
      .opt label:hover { border-color:#4f46e5; background:#1a1a3a; }
      .opt-value { font-size:22px; font-weight:800; color:#eef2ff; line-height:1; }
      .opt-unit  { font-size:11px; color:#b8c0d9; text-transform:uppercase; letter-spacing:.06em; }
      .opt-desc  { font-size:10px; color:#64748b; }

      .custom-row { display:flex; gap:10px; align-items:center; margin-top:4px; }
      input[type="number"] { width:100px; padding:9px 12px; border-radius:10px; border:1px solid #2a3550; background:#0b1220; color:#eef2ff; font-size:14px; font-weight:700; outline:none; text-align:center; }
      input[type="number"]:focus { border-color:#6366f1; }
      .custom-label { font-size:13px; color:#b8c0d9; }

      .info-box { background:#0b1a30; border:1px solid #1e3a5f; border-radius:12px; padding:14px 16px; }
      .info-box p { margin:0 0 6px; font-size:13px; color:#93c5fd; line-height:1.5; }
      .info-box p:last-child { margin:0; }
      .info-box strong { color:#bfdbfe; }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>Configuración</h1>
        <div class="sub">Sesión: <?= htmlspecialchars((string)$user, ENT_QUOTES, 'UTF-8') ?></div>
      </div>
      <a href="/admin" class="btn">← Dashboard</a>
    </header>

    <div class="page">

      <?php if ($flash === 'guardado') : ?>
        <div class="flash flash-ok">Configuración guardada correctamente.</div>
      <?php endif; ?>

      <?php $currentGrace = (int)($settings['grace_hours'] ?? 72); ?>

      <div class="card">
        <p class="card-title">Periodo de gracia offline</p>
        <p class="card-desc">
          Tiempo máximo que la app puede funcionar <strong>sin internet</strong> después de la
          última validación exitosa. Al cumplirse este plazo sin reconectar, la app se bloquea
          automáticamente hasta que el dispositivo vuelva a validar contra el servidor.
        </p>

        <form method="post" action="/admin/settings">
          <div class="field">
            <div class="options-grid">

              <?php
                $presets = [
                  ['hours' => 24,  'label' => '24',  'unit' => 'horas',  'desc' => '1 día'],
                  ['hours' => 48,  'label' => '48',  'unit' => 'horas',  'desc' => '2 días'],
                  ['hours' => 72,  'label' => '72',  'unit' => 'horas',  'desc' => '3 días (recomendado)'],
                  ['hours' => 168, 'label' => '7',   'unit' => 'días',   'desc' => '1 semana'],
                  ['hours' => 360, 'label' => '15',  'unit' => 'días',   'desc' => '2 semanas'],
                  ['hours' => 720, 'label' => '30',  'unit' => 'días',   'desc' => '1 mes'],
                ];
                $isCustom = !in_array($currentGrace, array_column($presets, 'hours'), true);
              ?>

              <?php foreach ($presets as $p) : ?>
                <div class="opt">
                  <input
                    type="radio" name="grace_hours"
                    id="g<?= $p['hours'] ?>"
                    value="<?= $p['hours'] ?>"
                    <?= $currentGrace === $p['hours'] ? 'checked' : '' ?>
                    onchange="document.getElementById('custom_val').value=''"
                  />
                  <label for="g<?= $p['hours'] ?>">
                    <span class="opt-value"><?= $p['label'] ?></span>
                    <span class="opt-unit"><?= $p['unit'] ?></span>
                    <span class="opt-desc"><?= $p['desc'] ?></span>
                  </label>
                </div>
              <?php endforeach; ?>

            </div>

            <!-- Valor personalizado -->
            <div class="custom-row">
              <input
                type="number" id="custom_val"
                min="1" max="720"
                placeholder="—"
                value="<?= $isCustom ? $currentGrace : '' ?>"
                onchange="
                  if (this.value) {
                    document.querySelectorAll('[name=grace_hours]').forEach(r => r.checked = false);
                    this.form.querySelector('[name=grace_hours]').value = this.value;
                  }
                "
              />
              <span class="custom-label">horas personalizadas (1–720)</span>
            </div>
            <span class="field-hint">
              Actualmente: <strong><?= $currentGrace ?>h</strong>
              (<?= round($currentGrace / 24, 1) ?> días).
              La app recibe este valor en cada validación exitosa.
            </span>
          </div>

          <button class="btn btn-primary" type="submit">Guardar configuración</button>
        </form>
      </div>

      <!-- Cómo funciona -->
      <div class="info-box">
        <p><strong>¿Cómo funciona el periodo de gracia?</strong></p>
        <p>
          Cada vez que la app valida la licencia correctamente contra el servidor,
          guarda localmente un timestamp y el número de horas de gracia.
        </p>
        <p>
          Si el dispositivo pierde internet, la app sigue funcionando hasta agotar
          ese periodo. Pasado ese tiempo, la app se bloquea con un mensaje claro
          hasta que el dispositivo reconecte y valide de nuevo.
        </p>
        <p>
          Si bloqueas un dispositivo desde el dashboard, el bloqueo es <strong>inmediato</strong>
          la próxima vez que el dispositivo tenga internet — el caché no puede sobrepasar
          un bloqueo activo del servidor.
        </p>
      </div>

    </div>

    <script>
      // Sincroniza el input personalizado con el radio group
      document.getElementById('custom_val').addEventListener('input', function() {
        if (!this.value) return;
        document.querySelectorAll('input[name="grace_hours"]').forEach(r => r.checked = false);
      });
      document.querySelectorAll('input[name="grace_hours"]').forEach(r => {
        r.addEventListener('change', () => {
          document.getElementById('custom_val').value = '';
        });
      });

      // Al hacer submit, si hay valor personalizado, lo manda como grace_hours
      document.querySelector('form').addEventListener('submit', function(e) {
        const custom = document.getElementById('custom_val').value;
        if (custom) {
          e.preventDefault();
          const h = parseInt(custom, 10);
          if (!h || h < 1 || h > 720) { alert('Introduce un valor entre 1 y 720 horas.'); return; }
          const inp = document.createElement('input');
          inp.type = 'hidden'; inp.name = 'grace_hours'; inp.value = h;
          this.appendChild(inp);
          document.querySelectorAll('input[name="grace_hours"][type="radio"]').forEach(r => r.disabled = true);
          this.submit();
        }
      });
    </script>
  </body>
</html>
