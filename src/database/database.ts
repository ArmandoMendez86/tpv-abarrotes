import { open, type QuickSQLiteConnection } from 'react-native-quick-sqlite';
import { MIGRATIONS, SCHEMA_STATEMENTS, SCHEMA_VERSION } from './schema';
import { runSeedersIfNeeded } from './seed/seed';

const DB_NAME = 'pvt.db';

let connection: QuickSQLiteConnection | null = null;
let initPromise: Promise<QuickSQLiteConnection> | null = null;

/**
 * Devuelve una conexión inicializada a la base local. Garantiza que:
 *  1. La conexión se abre una sola vez (singleton).
 *  2. El esquema base está aplicado (idempotente).
 *  3. Las migraciones incrementales se ejecutaron (preservan datos).
 *  4. Los seeders iniciales corrieron (solo en primera instalación).
 */
export function initDatabase(): Promise<QuickSQLiteConnection> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = open({ name: DB_NAME });
    db.execute('PRAGMA foreign_keys = ON;');

    // Estado inicial: para instalaciones nuevas crea TODO el esquema actual;
    // para instalaciones existentes los CREATE IF NOT EXISTS son no-ops y los
    // ALTER necesarios los hace el runner de migraciones (más abajo).
    //
    // Importante: ejecutamos cada sentencia individualmente (no en una única
    // transacción) para que el mensaje de error indique exactamente cuál SQL
    // falló. Cada sentencia es idempotente (IF NOT EXISTS), así que ejecutar
    // varias veces no rompe la base.
    for (const stmt of SCHEMA_STATEMENTS) {
      try {
        db.execute(stmt);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(
          `Falló inicialización del esquema: ${msg}\nSentencia:\n${stmt}`,
        );
      }
    }

    await applyMigrations(db);

    await runSeedersIfNeeded(db);

    connection = db;
    return db;
  })();

  return initPromise;
}

/**
 * Aplica migraciones incrementales por encima de la versión actual leída en
 * app_meta. Cada paso corre en su propia transacción para que un fallo a la
 * mitad no deje la BD a medio actualizar.
 */
async function applyMigrations(db: QuickSQLiteConnection): Promise<void> {
  const currentVersion = readSchemaVersion(db);

  for (const step of MIGRATIONS) {
    if (step.to <= currentVersion) {
      continue;
    }
    try {
      await db.transaction(tx => {
        for (const stmt of step.statements) {
          try {
            tx.execute(stmt);
          } catch (err: unknown) {
            // ALTER TABLE ADD COLUMN puede fallar si la columna ya existe en
            // instalaciones nuevas (ya creada vía SCHEMA_STATEMENTS). En ese
            // caso ignoramos; cualquier otro error sí re-lanza.
            const msg =
              err instanceof Error ? err.message.toLowerCase() : '';
            const isDuplicateColumn =
              /duplicate column name/.test(msg) ||
              /already exists/.test(msg);
            if (!isDuplicateColumn) {
              throw err;
            }
          }
        }
        tx.execute(
          `INSERT OR REPLACE INTO app_meta(key, value) VALUES ('schema_version', ?);`,
          [String(step.to)],
        );
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Migración a v${step.to} falló: ${msg}`);
    }
  }

  // Aseguramos que schema_version refleje el SCHEMA_VERSION declarado para
  // instalaciones nuevas que no necesitan migrar nada.
  if (readSchemaVersion(db) < SCHEMA_VERSION) {
    db.execute(
      `INSERT OR REPLACE INTO app_meta(key, value) VALUES ('schema_version', ?);`,
      [String(SCHEMA_VERSION)],
    );
  }
}

function readSchemaVersion(db: QuickSQLiteConnection): number {
  const res = db.execute(
    `SELECT value FROM app_meta WHERE key = 'schema_version' LIMIT 1;`,
  );
  const raw = res.rows?._array?.[0]?.value as string | undefined;
  if (!raw) {
    return 0;
  }
  const v = Number(raw);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Acceso síncrono a la conexión. Solo usar tras haber esperado initDatabase().
 * Lanza si todavía no está lista para que los bugs se vean rápido.
 */
export function getDb(): QuickSQLiteConnection {
  if (!connection) {
    throw new Error(
      'Base de datos no inicializada. Llama initDatabase() en el arranque.',
    );
  }
  return connection;
}
