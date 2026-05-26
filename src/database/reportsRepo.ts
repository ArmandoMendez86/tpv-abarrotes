import { getDb } from './database';

export type DateRange = { from: string; to: string }; // 'YYYY-MM-DD'

export interface CashSessionHistoryRow {
  id: number;
  opened_by: number;
  opened_at: string;
  opening_amount: number;
  closed_by: number | null;
  closed_at: string | null;
  counted_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  status: 'open' | 'closed';
  opened_by_name: string;
  closed_by_name: string | null;
  // Ventas asociadas al turno
  sales_total: number;
  sales_count: number;
}

export function listCashSessionsByDate(range: DateRange): CashSessionHistoryRow[] {
  const res = getDb().execute(
    `SELECT s.id, s.opened_by, s.opened_at, s.opening_amount,
            s.closed_by, s.closed_at, s.counted_amount, s.expected_amount, s.difference,
            s.status,
            COALESCE(NULLIF(TRIM(uo.full_name), ''), uo.username) AS opened_by_name,
            COALESCE(NULLIF(TRIM(uc.full_name), ''), uc.username) AS closed_by_name,
            COALESCE(SUM(v.total), 0) AS sales_total,
            COALESCE(COUNT(v.id), 0) AS sales_count
       FROM cash_sessions s
       JOIN usuarios uo ON uo.id = s.opened_by
       LEFT JOIN usuarios uc ON uc.id = s.closed_by
       LEFT JOIN ventas v ON v.session_id = s.id
      WHERE date(COALESCE(s.closed_at, s.opened_at)) BETWEEN date(?) AND date(?)
      GROUP BY s.id
      ORDER BY COALESCE(s.closed_at, s.opened_at) DESC, s.id DESC;`,
    [range.from, range.to],
  );
  return (res.rows?._array as CashSessionHistoryRow[]) ?? [];
}

export interface SalesByUserRow {
  user_id: number;
  seller_display: string;
  tickets: number;
  total: number;
}

export function getSalesByUser(range: DateRange): SalesByUserRow[] {
  const res = getDb().execute(
    `SELECT v.user_id AS user_id,
            COALESCE(NULLIF(TRIM(u.full_name), ''), u.username) AS seller_display,
            COUNT(*) AS tickets,
            COALESCE(SUM(v.total), 0) AS total
       FROM ventas v
       JOIN usuarios u ON u.id = v.user_id
      WHERE date(v.created_at) BETWEEN date(?) AND date(?)
      GROUP BY v.user_id
      ORDER BY total DESC;`,
    [range.from, range.to],
  );
  return (res.rows?._array as SalesByUserRow[]) ?? [];
}

export interface MonthlySalesRow {
  month: string; // 'YYYY-MM'
  total: number;
  tickets: number;
}

/**
 * Devuelve meses con ventas (no rellena meses vacíos).
 * El frontend rellena huecos para mostrar 12 barras consistentes.
 */
export function getMonthlySalesLastN(months: number = 12): MonthlySalesRow[] {
  const res = getDb().execute(
    `SELECT strftime('%Y-%m', created_at) AS month,
            COALESCE(SUM(total), 0) AS total,
            COUNT(*) AS tickets
       FROM ventas
      WHERE created_at >= date('now', ?)
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC;`,
    [`-${months - 1} months`],
  );
  return (res.rows?._array as MonthlySalesRow[]) ?? [];
}

