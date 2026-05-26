/**
 * Tipos de los stacks de navegación.
 *
 * La app divide la navegación según el estado de la sesión:
 *  - AuthStack    : sin sesión (Login).
 *  - AdminStack   : sesión con rol 'Administrador'.
 *  - SellerStack  : sesión con rol 'Vendedor'.
 *
 * Mantener stacks separados por rol evita que un Vendedor llegue por error a
 * pantallas administrativas, incluso por bugs de navegación.
 */

export type AuthStackParamList = {
  Login: undefined;
};

export type AdminStackParamList = {
  AdminHome: undefined;
  ProductsList: undefined;
  ProductForm: { productId?: number; scannedBarcode?: string };
  BarcodeScanner: { returnTo: 'ProductForm'; returnToKey: string };
  DailySales: undefined;
  CashControl: undefined;
  CashHistory: undefined;
  CashSessionDetail: { sessionId: number };
  SalesByEmployee: undefined;
  SalesTrends: undefined;
  Vendors: undefined;
  LowStock: undefined;
  TopProducts: undefined;
  TicketSettings: undefined;
};

export type SellerStackParamList = {
  SellerHome: undefined;
};
