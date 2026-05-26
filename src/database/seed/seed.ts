import type {
  QuickSQLiteConnection,
  SQLBatchTuple,
} from 'react-native-quick-sqlite';
import productsCatalog from './products.json';

type SeedProduct = {
  barcode: string | null;
  name: string;
  category: string | null;
  cost: number;
  price: number;
};

const PRODUCTS: SeedProduct[] = productsCatalog as SeedProduct[];

/**
 * Tamaño del lote para insertar productos. Insertarlos todos en una sola
 * sentencia 'executeBatch' funciona, pero hacerlo por bloques mantiene la UI
 * con menor pico de memoria mientras se procesa el catálogo (~6.4k filas).
 */
const SEED_BATCH_SIZE = 500;

/**
 * Aplica los seeders de la primera instalación:
 *  - Inserta el catálogo inicial de productos.
 *  - Crea cuentas por defecto: 1 administrador y 1 vendedor.
 *
 * Es idempotente gracias a la bandera 'seed_done' en app_meta: si ya corrió,
 * la siguiente vez no hace nada. Para forzar un reseed durante desarrollo,
 * borra esa fila o desinstala la app.
 */
export async function runSeedersIfNeeded(
  db: QuickSQLiteConnection,
): Promise<void> {
  const flag = db.execute(
    `SELECT value FROM app_meta WHERE key = 'seed_done' LIMIT 1;`,
  );
  const alreadySeeded = (flag.rows?._array?.[0]?.value as string | undefined) === '1';
  if (alreadySeeded) {
    return;
  }

  await seedDefaultUsers(db);
  await seedProducts(db);

  db.execute(
    `INSERT OR REPLACE INTO app_meta(key, value) VALUES ('seed_done', '1');`,
  );
}

async function seedDefaultUsers(db: QuickSQLiteConnection): Promise<void> {
  const existing = db.execute(`SELECT COUNT(*) as c FROM usuarios;`);
  const count = (existing.rows?._array?.[0]?.c as number | undefined) ?? 0;
  if (count > 0) {
    return;
  }

  const defaultUsers: SQLBatchTuple[] = [
    [
      `INSERT INTO usuarios(username, password, pin, full_name, role) VALUES (?,?,?,?,?);`,
      ['admin', 'admin123', null, 'Administrador', 'Administrador'],
    ],
    [
      `INSERT INTO usuarios(username, password, pin, full_name, role) VALUES (?,?,?,?,?);`,
      ['cajero', 'cajero123', '1234', 'Cajero/Vendedor', 'Vendedor'],
    ],
  ];
  await db.executeBatchAsync(defaultUsers);
}

async function seedProducts(db: QuickSQLiteConnection): Promise<void> {
  const existing = db.execute(`SELECT COUNT(*) as c FROM productos;`);
  const count = (existing.rows?._array?.[0]?.c as number | undefined) ?? 0;
  if (count > 0) {
    return;
  }

  const insertSql =
    `INSERT OR IGNORE INTO productos(barcode, name, category, cost, price, stock) ` +
    `VALUES (?,?,?,?,?,?);`;

  for (let i = 0; i < PRODUCTS.length; i += SEED_BATCH_SIZE) {
    const slice = PRODUCTS.slice(i, i + SEED_BATCH_SIZE);
    const batch: SQLBatchTuple[] = slice.map(p => [
      insertSql,
      [p.barcode, p.name, p.category, p.cost, p.price, 0],
    ]);
    await db.executeBatchAsync(batch);
  }
}
