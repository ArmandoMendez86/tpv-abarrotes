/** Tipos compartidos por los repositorios. Reflejan filas de SQLite. */

export type UserRole = 'Administrador' | 'Vendedor';

export interface UserRow {
  id: number;
  username: string;
  full_name: string | null;
  role: UserRole;
  active: number;
  created_at: string;
}

export interface ProductRow {
  id: number;
  barcode: string | null;
  name: string;
  category: string | null;
  cost: number;
  price: number;
  stock: number;
  stock_min: number;
  active: number;
}

export interface SaleRow {
  id: number;
  user_id: number;
  /**
   * Turno de caja al que pertenece la venta. NULL si la venta se cobró sin
   * un turno abierto (datos previos a Control de Caja, o caja cerrada).
   */
  session_id: number | null;
  total: number;
  payment_method: string;
  cash_received: number | null;
  change_given: number | null;
  created_at: string;
}

export type CashSessionStatus = 'open' | 'closed';

export interface CashSessionRow {
  id: number;
  opened_by: number;
  opened_at: string;
  opening_amount: number;
  opening_notes: string | null;
  closed_by: number | null;
  closed_at: string | null;
  counted_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  closing_notes: string | null;
  status: CashSessionStatus;
}

export type CashMovementType = 'in' | 'out';

export interface CashMovementRow {
  id: number;
  session_id: number;
  user_id: number;
  type: CashMovementType;
  amount: number;
  reason: string | null;
  created_at: string;
}

export interface CashSessionSummary {
  session: CashSessionRow;
  cashSalesTotal: number;
  cashSalesCount: number;
  movementsIn: number;
  movementsOut: number;
  /** Total que DEBERÍA haber físicamente en la caja en este momento. */
  expectedCash: number;
}

export interface SaleItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateSaleInput {
  userId: number;
  items: SaleItemInput[];
  paymentMethod?: string;
  cashReceived?: number;
}

export interface CreateSaleResult {
  saleId: number;
  total: number;
  changeGiven: number | null;
}
