import { getDb } from './database';
import type { ProductRow } from './models';

/** Cantidad por defecto para limitar resultados de búsquedas en pantalla. */
const DEFAULT_LIMIT = 50;

export function countProducts(): number {
  const res = getDb().execute(`SELECT COUNT(*) AS c FROM productos;`);
  return (res.rows?._array?.[0]?.c as number) ?? 0;
}

/**
 * Búsqueda incremental para el cajero: tolerante a mayúsculas y a fragmentos
 * del nombre o categoría. Si la cadena coincide con un código de barras,
 * devuelve esa coincidencia primero.
 */
export function searchProducts(
  query: string,
  limit: number = DEFAULT_LIMIT,
): ProductRow[] {
  const db = getDb();
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    const res = db.execute(
      `SELECT * FROM productos WHERE active = 1 ORDER BY name LIMIT ?;`,
      [limit],
    );
    return (res.rows?._array as ProductRow[]) ?? [];
  }

  const like = `%${trimmed}%`;
  const res = db.execute(
    `SELECT * FROM productos
     WHERE active = 1
       AND (name LIKE ? OR category LIKE ? OR barcode = ?)
     ORDER BY (barcode = ?) DESC, name ASC
     LIMIT ?;`,
    [like, like, trimmed, trimmed, limit],
  );
  return (res.rows?._array as ProductRow[]) ?? [];
}

export function findProductByBarcode(barcode: string): ProductRow | null {
  const res = getDb().execute(
    `SELECT * FROM productos WHERE barcode = ? AND active = 1 LIMIT 1;`,
    [barcode],
  );
  return (res.rows?._array?.[0] as ProductRow | undefined) ?? null;
}

export function getProductById(id: number): ProductRow | null {
  const res = getDb().execute(`SELECT * FROM productos WHERE id = ?;`, [id]);
  return (res.rows?._array?.[0] as ProductRow | undefined) ?? null;
}

/** Útil para la pantalla de Administrador / ajuste de inventario. */
export function setProductStock(id: number, stock: number): void {
  getDb().execute(
    `UPDATE productos SET stock = ?, updated_at = datetime('now') WHERE id = ?;`,
    [stock, id],
  );
}

/**
 * Listado para el panel del Administrador. A diferencia de 'searchProducts',
 * incluye productos inactivos para que el admin pueda reactivarlos. La paginación
 * va por offset/limit; el front carga páginas conforme el usuario hace scroll.
 */
export function listProductsForAdmin(
  query: string,
  limit: number,
  offset: number,
): ProductRow[] {
  const db = getDb();
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    const res = db.execute(
      `SELECT * FROM productos ORDER BY name LIMIT ? OFFSET ?;`,
      [limit, offset],
    );
    return (res.rows?._array as ProductRow[]) ?? [];
  }
  const like = `%${trimmed}%`;
  const res = db.execute(
    `SELECT * FROM productos
       WHERE name LIKE ? OR category LIKE ? OR barcode = ?
       ORDER BY (barcode = ?) DESC, name ASC
       LIMIT ? OFFSET ?;`,
    [like, like, trimmed, trimmed, limit, offset],
  );
  return (res.rows?._array as ProductRow[]) ?? [];
}

export interface ProductInput {
  barcode?: string | null;
  name: string;
  category?: string | null;
  cost: number;
  price: number;
  stock: number;
  stockMin: number;
}

/**
 * Crea un producto nuevo. Lanza si el código de barras ya existe (UNIQUE en
 * la tabla); el formulario debe atrapar el error y avisar al admin.
 */
export function createProduct(input: ProductInput): number {
  const res = getDb().execute(
    `INSERT INTO productos (barcode, name, category, cost, price, stock, stock_min)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      input.barcode ?? null,
      input.name.trim(),
      input.category?.trim() || null,
      input.cost,
      input.price,
      input.stock,
      input.stockMin,
    ],
  );
  const id = res.insertId ?? -1;
  if (id < 0 || res.rowsAffected < 1) {
    throw new Error(
      'No se pudo crear el producto. Revisa que el código de barras no esté duplicado.',
    );
  }
  return id;
}

export function updateProduct(id: number, input: ProductInput): void {
  const res = getDb().execute(
    `UPDATE productos
        SET barcode    = ?,
            name       = ?,
            category   = ?,
            cost       = ?,
            price      = ?,
            stock      = ?,
            stock_min  = ?,
            updated_at = datetime('now')
      WHERE id = ?;`,
    [
      input.barcode ?? null,
      input.name.trim(),
      input.category?.trim() || null,
      input.cost,
      input.price,
      input.stock,
      input.stockMin,
      id,
    ],
  );
  if (res.rowsAffected < 1) {
    throw new Error(
      'No se pudo actualizar. El producto pudo haberse eliminado o el código de barras está duplicado.',
    );
  }
}

export function listLowStockProducts(limit: number = 200): ProductRow[] {
  const res = getDb().execute(
    `SELECT *
       FROM productos
      WHERE active = 1
        AND stock <= COALESCE(stock_min, 0)
      ORDER BY (stock - COALESCE(stock_min, 0)) ASC, name ASC
      LIMIT ?;`,
    [limit],
  );
  return (res.rows?._array as ProductRow[]) ?? [];
}

export interface TopProductRow {
  product_id: number;
  name: string;
  revenue: number;
  units: number;
}

export function getTopProductsByRevenue(
  date: string,
  limit: number,
): TopProductRow[] {
  const res = getDb().execute(
    `SELECT p.id AS product_id,
            p.name AS name,
            COALESCE(SUM(d.subtotal), 0) AS revenue,
            COALESCE(SUM(d.quantity), 0) AS units
       FROM detalle_ventas d
       JOIN ventas v ON v.id = d.venta_id
       JOIN productos p ON p.id = d.producto_id
      WHERE date(v.created_at) = date(?)
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT ?;`,
    [date, limit],
  );
  return (res.rows?._array as TopProductRow[]) ?? [];
}

export function getTopProductsByUnits(
  date: string,
  limit: number,
): TopProductRow[] {
  const res = getDb().execute(
    `SELECT p.id AS product_id,
            p.name AS name,
            COALESCE(SUM(d.subtotal), 0) AS revenue,
            COALESCE(SUM(d.quantity), 0) AS units
       FROM detalle_ventas d
       JOIN ventas v ON v.id = d.venta_id
       JOIN productos p ON p.id = d.producto_id
      WHERE date(v.created_at) = date(?)
      GROUP BY p.id, p.name
      ORDER BY units DESC
      LIMIT ?;`,
    [date, limit],
  );
  return (res.rows?._array as TopProductRow[]) ?? [];
}

/**
 * Soft-delete: marcamos 'active = 0' en lugar de borrar físicamente.
 * Esto preserva la integridad histórica de las ventas (detalle_ventas referencia
 * 'producto_id' con FK), evita romper reportes pasados y permite "rescatar"
 * un producto desactivado por error con un solo toggle.
 */
export function setProductActive(id: number, active: boolean): void {
  getDb().execute(
    `UPDATE productos SET active = ?, updated_at = datetime('now') WHERE id = ?;`,
    [active ? 1 : 0, id],
  );
}
