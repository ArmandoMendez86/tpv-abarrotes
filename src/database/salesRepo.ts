import { getOpenSessionId } from './cashRepo';
import { getDb } from './database';
import type { CreateSaleInput, CreateSaleResult, SaleRow } from './models';

/**
 * Registra una venta de forma TRANSACCIONAL: si cualquier paso falla
 * (stock insuficiente, error al insertar detalle, etc.), todo se revierte.
 * Esto es crítico en un POS: nunca queremos un encabezado sin detalle, ni
 * detalle sin descontar inventario.
 */
export async function createSale(
  input: CreateSaleInput,
): Promise<CreateSaleResult> {
  if (input.items.length === 0) {
    throw new Error('La venta debe tener al menos un producto.');
  }

  const total = input.items.reduce(
    (acc, it) => acc + it.unitPrice * it.quantity,
    0,
  );
  const cashReceived = input.paymentMethod === 'efectivo'
    ? input.cashReceived ?? null
    : null;
  const changeGiven =
    cashReceived != null && cashReceived >= total ? cashReceived - total : null;

  // Si hay un turno de caja abierto, vinculamos la venta a ese turno para que
  // el cuadre/arqueo lo tome en cuenta. Si no hay turno abierto, la venta se
  // registra igual con session_id = NULL (compatibilidad con datos previos).
  const sessionId = getOpenSessionId();

  let saleId = -1;

  await getDb().transaction(tx => {
    const ventaRes = tx.execute(
      `INSERT INTO ventas
        (user_id, session_id, total, payment_method, cash_received, change_given)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        input.userId,
        sessionId,
        total,
        input.paymentMethod ?? 'efectivo',
        cashReceived,
        changeGiven,
      ],
    );
    saleId = ventaRes.insertId ?? -1;
    if (saleId < 0) {
      throw new Error('No se pudo generar el ID de la venta.');
    }

    for (const item of input.items) {
      const subtotal = item.unitPrice * item.quantity;

      tx.execute(
        `INSERT INTO detalle_ventas(venta_id, producto_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?);`,
        [saleId, item.productId, item.quantity, item.unitPrice, subtotal],
      );

      tx.execute(
        `UPDATE productos
            SET stock = stock - ?,
                updated_at = datetime('now')
          WHERE id = ?;`,
        [item.quantity, item.productId],
      );
    }
  });

  return { saleId, total, changeGiven };
}

export function listSalesOfDay(date: string = todayIso()): SaleRow[] {
  const res = getDb().execute(
    `SELECT * FROM ventas
      WHERE date(created_at) = date(?)
      ORDER BY created_at DESC;`,
    [date],
  );
  return (res.rows?._array as SaleRow[]) ?? [];
}

export function getSaleTotalsOfDay(
  date: string = todayIso(),
  userId?: number,
): {
  count: number;
  total: number;
} {
  const whereUser = userId != null ? ' AND user_id = ?' : '';
  const res = getDb().execute(
    `SELECT COUNT(*) AS c, COALESCE(SUM(total), 0) AS t
       FROM ventas
      WHERE date(created_at) = date(?)${whereUser};`,
    userId != null ? [date, userId] : [date],
  );
  const row = res.rows?._array?.[0];
  return {
    count: (row?.c as number) ?? 0,
    total: (row?.t as number) ?? 0,
  };
}

export interface SaleWithSellerRow extends SaleRow {
  seller_display: string;
}

export function listSalesOfDayWithSeller(
  date: string = todayIso(),
  userId?: number,
): SaleWithSellerRow[] {
  const whereUser = userId != null ? ' AND v.user_id = ?' : '';
  const res = getDb().execute(
    `SELECT v.id, v.user_id, v.session_id, v.total, v.payment_method,
            v.cash_received, v.change_given, v.created_at,
            COALESCE(NULLIF(TRIM(u.full_name), ''), u.username) AS seller_display
       FROM ventas v
       JOIN usuarios u ON u.id = v.user_id
      WHERE date(v.created_at) = date(?)${whereUser}
      ORDER BY v.created_at DESC;`,
    userId != null ? [date, userId] : [date],
  );
  return (res.rows?._array as SaleWithSellerRow[]) ?? [];
}

export function listSalesBySessionWithSeller(
  sessionId: number,
): SaleWithSellerRow[] {
  const res = getDb().execute(
    `SELECT v.id, v.user_id, v.session_id, v.total, v.payment_method,
            v.cash_received, v.change_given, v.created_at,
            COALESCE(NULLIF(TRIM(u.full_name), ''), u.username) AS seller_display
       FROM ventas v
       JOIN usuarios u ON u.id = v.user_id
      WHERE v.session_id = ?
      ORDER BY v.created_at DESC;`,
    [sessionId],
  );
  return (res.rows?._array as SaleWithSellerRow[]) ?? [];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface SaleItemDetailRow {
  id: number;
  venta_id: number;
  producto_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

/** Devuelve los renglones de un ticket con el nombre del producto resuelto. */
export function getSaleItems(saleId: number): SaleItemDetailRow[] {
  const res = getDb().execute(
    `SELECT d.id, d.venta_id, d.producto_id,
            p.name AS product_name,
            d.quantity, d.unit_price, d.subtotal
       FROM detalle_ventas d
       JOIN productos p ON p.id = d.producto_id
      WHERE d.venta_id = ?
      ORDER BY d.id ASC;`,
    [saleId],
  );
  return (res.rows?._array as SaleItemDetailRow[]) ?? [];
}
