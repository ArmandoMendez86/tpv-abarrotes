/**
 * Tipos de los stacks de navegación.
 *
 * La app divide la navegación según el estado de la sesión y la licencia:
 *  - ActivationStack : primera instalación, sin licencia activada.
 *  - AuthStack       : licencia válida, sin sesión (Login).
 *  - AdminStack      : sesión con rol 'Administrador'.
 *  - SellerStack     : sesión con rol 'Vendedor'.
 *
 * Mantener stacks separados evita que un Vendedor llegue por error a
 * pantallas administrativas, incluso por bugs de navegación.
 */

export type ActivationStackParamList = {
  LicenseActivation: undefined;
};

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
