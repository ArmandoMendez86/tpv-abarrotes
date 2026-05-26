/**
 * Definición SQL del esquema local. Cada bloque está pensado para ser
 * idempotente (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS) para
 * que aplicar la migración varias veces no rompa la base.
 *
 * Tablas:
 *  - app_meta        : pares clave/valor para flags internos (seed, versión).
 *  - usuarios        : cuentas locales con rol 'Administrador' o 'Vendedor'.
 *  - productos       : catálogo de venta.
 *  - ventas          : encabezado de cada ticket.
 *  - detalle_ventas  : renglones del ticket (un producto por fila).
 *  - cash_sessions   : turnos de caja (apertura/cierre con fondo y arqueo).
 *  - cash_movements  : entradas/salidas manuales de efectivo en un turno.
 *
 * Versionado:
 *  - SCHEMA_VERSION sube cuando agregamos cambios irreversibles (nuevas
 *    columnas, etc). El runner de migraciones aplica las MIGRATIONS_TO
 *    necesarias según la versión guardada en app_meta.
 *  - Para instalaciones nuevas se ejecutan SCHEMA_STATEMENTS (que ya incluyen
 *    todo el estado final), por eso los CREATE deben reflejar la versión más
 *    reciente.
 */

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS app_meta (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password      TEXT    NOT NULL,
    pin           TEXT,
    full_name     TEXT,
    role          TEXT    NOT NULL CHECK (role IN ('Administrador','Vendedor')),
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE TABLE IF NOT EXISTS productos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode     TEXT    UNIQUE,
    name        TEXT    NOT NULL,
    category    TEXT,
    cost        REAL    NOT NULL DEFAULT 0,
    price       REAL    NOT NULL DEFAULT 0,
    stock       INTEGER NOT NULL DEFAULT 0,
    stock_min   INTEGER NOT NULL DEFAULT 10,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE INDEX IF NOT EXISTS idx_productos_name     ON productos(name);`,
  `CREATE INDEX IF NOT EXISTS idx_productos_category ON productos(category);`,
  `CREATE INDEX IF NOT EXISTS idx_productos_barcode  ON productos(barcode);`,

  `CREATE TABLE IF NOT EXISTS cash_sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    opened_by       INTEGER NOT NULL REFERENCES usuarios(id),
    opened_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    opening_amount  REAL    NOT NULL,
    opening_notes   TEXT,
    closed_by       INTEGER REFERENCES usuarios(id),
    closed_at       TEXT,
    counted_amount  REAL,
    expected_amount REAL,
    difference      REAL,
    closing_notes   TEXT,
    status          TEXT    NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','closed'))
  );`,

  `CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status);`,

  `CREATE TABLE IF NOT EXISTS cash_movements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES usuarios(id),
    type        TEXT    NOT NULL CHECK (type IN ('in','out')),
    amount      REAL    NOT NULL,
    reason      TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(session_id);`,

  `CREATE TABLE IF NOT EXISTS ventas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES usuarios(id),
    session_id      INTEGER REFERENCES cash_sessions(id),
    total           REAL    NOT NULL,
    payment_method  TEXT    NOT NULL DEFAULT 'efectivo',
    cash_received   REAL,
    change_given    REAL,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE INDEX IF NOT EXISTS idx_ventas_created_at ON ventas(created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_ventas_user       ON ventas(user_id);`,
  // Nota: idx_ventas_session NO va aquí porque depende de la columna
  // 'session_id' que solo existe tras aplicar la migración v2 en bases
  // creadas en v1. El runner de migraciones lo crea allí (idempotente).

  `CREATE TABLE IF NOT EXISTS detalle_ventas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id    INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    quantity    INTEGER NOT NULL,
    unit_price  REAL    NOT NULL,
    subtotal    REAL    NOT NULL
  );`,

  `CREATE INDEX IF NOT EXISTS idx_detalle_venta ON detalle_ventas(venta_id);`,

  /**
   * Configuración del negocio y del ticket.
   * Se guarda en SQLite para mantener la app 100% offline.
   *
   * printer_mode:
   *  - 'none'     : sin impresora configurada todavía
   *  - 'bluetooth': impresora térmica BT (futuro: escaneo/pareado)
   *  - 'network'  : impresora en red (IP/puerto)
   */
  `CREATE TABLE IF NOT EXISTS ticket_settings (
    id               INTEGER PRIMARY KEY CHECK (id = 1),
    store_name       TEXT NOT NULL DEFAULT '',
    store_address    TEXT NOT NULL DEFAULT '',
    store_phone      TEXT NOT NULL DEFAULT '',
    farewell_message TEXT NOT NULL DEFAULT '',
    printer_mode     TEXT NOT NULL DEFAULT 'none'
                    CHECK (printer_mode IN ('none','bluetooth','network')),
    bt_device_name   TEXT,
    bt_device_id     TEXT,
    net_host         TEXT,
    net_port         INTEGER,
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  // Asegura que siempre exista el registro único (id=1)
  `INSERT OR IGNORE INTO ticket_settings(id) VALUES (1);`,
];

export const SCHEMA_VERSION = 5;

/**
 * Migraciones incrementales para bases que ya existen en versiones anteriores.
 * El runner ejecuta cada bloque cuyo `to` sea mayor a la versión actual.
 * Cada sentencia debe ser segura para ejecutarse una sola vez (no reentrante);
 * el runner las envuelve en una transacción y actualiza schema_version al final.
 *
 * Limitación SQLite: ALTER TABLE ADD COLUMN no permite REFERENCES ni CHECK.
 * Por eso 'session_id' en 'ventas' se añade sin FK declarada (la integridad
 * la cuidamos desde el código). En instalaciones nuevas, SCHEMA_STATEMENTS
 * sí crea la FK correcta desde el inicio.
 */
export interface MigrationStep {
  to: number;
  statements: string[];
}

export const MIGRATIONS: MigrationStep[] = [
  {
    to: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS cash_sessions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        opened_by       INTEGER NOT NULL,
        opened_at       TEXT    NOT NULL DEFAULT (datetime('now')),
        opening_amount  REAL    NOT NULL,
        opening_notes   TEXT,
        closed_by       INTEGER,
        closed_at       TEXT,
        counted_amount  REAL,
        expected_amount REAL,
        difference      REAL,
        closing_notes   TEXT,
        status          TEXT    NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','closed'))
      );`,
      `CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status);`,
      `CREATE TABLE IF NOT EXISTS cash_movements (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id  INTEGER NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
        user_id     INTEGER NOT NULL,
        type        TEXT    NOT NULL CHECK (type IN ('in','out')),
        amount      REAL    NOT NULL,
        reason      TEXT,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
      );`,
      `CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(session_id);`,
      // ALTER puede fallar si la columna ya existe (instalaciones nuevas que
      // ya la crearon vía SCHEMA_STATEMENTS). El runner ignora ese caso.
      `ALTER TABLE ventas ADD COLUMN session_id INTEGER;`,
      `CREATE INDEX IF NOT EXISTS idx_ventas_session ON ventas(session_id);`,
    ],
  },
  {
    to: 3,
    statements: [
      // Habilita login rápido por PIN para Vendedores.
      `ALTER TABLE usuarios ADD COLUMN pin TEXT;`,
      `CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);`,
      `CREATE INDEX IF NOT EXISTS idx_usuarios_active ON usuarios(active);`,
    ],
  },
  {
    to: 4,
    statements: [
      `ALTER TABLE productos ADD COLUMN stock_min INTEGER;`,
      // Para bases existentes: empezamos con stock=100 como pediste.
      `UPDATE productos SET stock = 100;`,
      // Y un mínimo razonable por defecto, pero sin romper si el admin ya editó algo.
      `UPDATE productos SET stock_min = 10 WHERE stock_min IS NULL;`,
      `CREATE INDEX IF NOT EXISTS idx_productos_stock_min ON productos(stock_min);`,
      `CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock);`,
    ],
  },
  {
    to: 5,
    statements: [
      `CREATE TABLE IF NOT EXISTS ticket_settings (
        id               INTEGER PRIMARY KEY CHECK (id = 1),
        store_name       TEXT NOT NULL DEFAULT '',
        store_address    TEXT NOT NULL DEFAULT '',
        store_phone      TEXT NOT NULL DEFAULT '',
        farewell_message TEXT NOT NULL DEFAULT '',
        printer_mode     TEXT NOT NULL DEFAULT 'none'
                        CHECK (printer_mode IN ('none','bluetooth','network')),
        bt_device_name   TEXT,
        bt_device_id     TEXT,
        net_host         TEXT,
        net_port         INTEGER,
        updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
      );`,
      `INSERT OR IGNORE INTO ticket_settings(id) VALUES (1);`,
    ],
  },
];
