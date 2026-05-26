import { getDb } from './database';
import type {
  CashMovementRow,
  CashMovementType,
  CashSessionRow,
  CashSessionSummary,
} from './models';

/**
 * Repositorio de Control de Caja.
 *
 * Concepto:
 *  - Solo puede haber UN turno abierto a la vez. La consulta de "abierto"
 *    se ordena por id DESC y limita a 1 para tolerar inconsistencias raras.
 *  - El "esperado en caja" se calcula así:
 *      fondo_inicial + ventas_efectivo + entradas_manuales − salidas_manuales
 *  - Al cerrar el turno guardamos lo CONTADO físicamente y la DIFERENCIA
 *    para tener un historial confiable del cuadre.
 */

export function getOpenSession(): CashSessionRow | null {
  const res = getDb().execute(
    `SELECT * FROM cash_sessions
      WHERE status = 'open'
      ORDER BY id DESC
      LIMIT 1;`,
  );
  return (res.rows?._array?.[0] as CashSessionRow | undefined) ?? null;
}

export function getOpenSessionId(): number | null {
  const res = getDb().execute(
    `SELECT id FROM cash_sessions
      WHERE status = 'open'
      ORDER BY id DESC
      LIMIT 1;`,
  );
  const id = res.rows?._array?.[0]?.id as number | undefined;
  return typeof id === 'number' ? id : null;
}

export function getSessionById(id: number): CashSessionRow | null {
  const res = getDb().execute(`SELECT * FROM cash_sessions WHERE id = ?;`, [
    id,
  ]);
  return (res.rows?._array?.[0] as CashSessionRow | undefined) ?? null;
}

/**
 * Abre un turno nuevo. Lanza si ya existe uno abierto, para evitar dos
 * turnos simultáneos (regla de negocio del POS).
 */
export function openSession(input: {
  userId: number;
  openingAmount: number;
  notes?: string;
}): number {
  if (getOpenSessionId() != null) {
    throw new Error('Ya hay un turno de caja abierto. Ciérralo antes de abrir uno nuevo.');
  }
  if (!Number.isFinite(input.openingAmount) || input.openingAmount < 0) {
    throw new Error('El fondo de caja debe ser un número mayor o igual a 0.');
  }

  const res = getDb().execute(
    `INSERT INTO cash_sessions (opened_by, opening_amount, opening_notes, status)
     VALUES (?, ?, ?, 'open');`,
    [input.userId, input.openingAmount, input.notes?.trim() || null],
  );
  return res.insertId ?? -1;
}

/**
 * Cierra el turno: guarda el conteo físico, calcula esperado y diferencia.
 * Hace todo en una transacción para evitar estados a medio guardar.
 */
export async function closeSession(input: {
  sessionId: number;
  countedAmount: number;
  closedBy: number;
  notes?: string;
}): Promise<{ expected: number; difference: number }> {
  const session = getSessionById(input.sessionId);
  if (!session) {
    throw new Error('Turno no encontrado.');
  }
  if (session.status !== 'open') {
    throw new Error('El turno ya está cerrado.');
  }
  if (!Number.isFinite(input.countedAmount) || input.countedAmount < 0) {
    throw new Error('Captura un conteo válido (0 o mayor).');
  }

  const summary = getSessionSummary(input.sessionId);
  const expected = summary.expectedCash;
  const difference = input.countedAmount - expected;

  await getDb().transaction(tx => {
    tx.execute(
      `UPDATE cash_sessions
          SET status          = 'closed',
              closed_by       = ?,
              closed_at       = datetime('now'),
              counted_amount  = ?,
              expected_amount = ?,
              difference      = ?,
              closing_notes   = ?
        WHERE id = ?;`,
      [
        input.closedBy,
        input.countedAmount,
        expected,
        difference,
        input.notes?.trim() || null,
        input.sessionId,
      ],
    );
  });

  return { expected, difference };
}

export function addMovement(input: {
  sessionId: number;
  userId: number;
  type: CashMovementType;
  amount: number;
  reason?: string;
}): number {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Captura un monto mayor a 0.');
  }
  const session = getSessionById(input.sessionId);
  if (!session) {
    throw new Error('Turno no encontrado.');
  }
  if (session.status !== 'open') {
    throw new Error('El turno está cerrado: no se pueden registrar movimientos.');
  }

  const res = getDb().execute(
    `INSERT INTO cash_movements (session_id, user_id, type, amount, reason)
     VALUES (?, ?, ?, ?, ?);`,
    [
      input.sessionId,
      input.userId,
      input.type,
      input.amount,
      input.reason?.trim() || null,
    ],
  );
  return res.insertId ?? -1;
}

export function listMovements(sessionId: number): CashMovementRow[] {
  const res = getDb().execute(
    `SELECT * FROM cash_movements
      WHERE session_id = ?
      ORDER BY created_at DESC, id DESC;`,
    [sessionId],
  );
  return (res.rows?._array as CashMovementRow[]) ?? [];
}

/**
 * Resumen del turno: totales de ventas en efectivo, entradas/salidas y
 * el efectivo esperado físicamente. Lo usa la pantalla de Control de Caja
 * en vivo y el cierre para calcular la diferencia.
 */
export function getSessionSummary(sessionId: number): CashSessionSummary {
  const session = getSessionById(sessionId);
  if (!session) {
    throw new Error('Turno no encontrado.');
  }

  const db = getDb();

  const salesRes = db.execute(
    `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS c
       FROM ventas
      WHERE session_id = ?
        AND payment_method = 'efectivo';`,
    [sessionId],
  );
  const cashSalesTotal =
    (salesRes.rows?._array?.[0]?.total as number | undefined) ?? 0;
  const cashSalesCount =
    (salesRes.rows?._array?.[0]?.c as number | undefined) ?? 0;

  const inRes = db.execute(
    `SELECT COALESCE(SUM(amount), 0) AS s FROM cash_movements
      WHERE session_id = ? AND type = 'in';`,
    [sessionId],
  );
  const movementsIn =
    (inRes.rows?._array?.[0]?.s as number | undefined) ?? 0;

  const outRes = db.execute(
    `SELECT COALESCE(SUM(amount), 0) AS s FROM cash_movements
      WHERE session_id = ? AND type = 'out';`,
    [sessionId],
  );
  const movementsOut =
    (outRes.rows?._array?.[0]?.s as number | undefined) ?? 0;

  const expectedCash =
    session.opening_amount + cashSalesTotal + movementsIn - movementsOut;

  return {
    session,
    cashSalesTotal,
    cashSalesCount,
    movementsIn,
    movementsOut,
    expectedCash,
  };
}

export function listClosedSessionsRecent(limit: number = 20): CashSessionRow[] {
  const res = getDb().execute(
    `SELECT * FROM cash_sessions
      WHERE status = 'closed'
      ORDER BY closed_at DESC
      LIMIT ?;`,
    [limit],
  );
  return (res.rows?._array as CashSessionRow[]) ?? [];
}
