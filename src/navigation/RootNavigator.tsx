import { StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { AdminHomeScreen } from '../screens/AdminHomeScreen';
import { BarcodeScannerScreen } from '../screens/BarcodeScannerScreen';
import { CashHistoryScreen } from '../screens/CashHistoryScreen';
import { CashSessionDetailScreen } from '../screens/CashSessionDetailScreen';
import { CashControlScreen } from '../screens/CashControlScreen';
import { DailySalesScreen } from '../screens/DailySalesScreen';
import { LicenseActivationScreen } from '../screens/LicenseActivationScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { LowStockScreen } from '../screens/LowStockScreen';
import { ProductFormScreen } from '../screens/ProductFormScreen';
import { ProductsListScreen } from '../screens/ProductsListScreen';
import { SalesByEmployeeScreen } from '../screens/SalesByEmployeeScreen';
import { SellerHomeScreen } from '../screens/SellerHomeScreen';
import { SalesTrendsScreen } from '../screens/SalesTrendsScreen';
import { TicketSettingsScreen } from '../screens/TicketSettingsScreen';
import { TopProductsScreen } from '../screens/TopProductsScreen';
import { VendorsScreen } from '../screens/VendorsScreen';
import { colors } from '../theme/theme';
import type {
  ActivationStackParamList,
  AdminStackParamList,
  AuthStackParamList,
  SellerStackParamList,
} from './types';

const ActivationStack = createNativeStackNavigator<ActivationStackParamList>();
const AuthStack       = createNativeStackNavigator<AuthStackParamList>();
const AdminStack      = createNativeStackNavigator<AdminStackParamList>();
const SellerStack     = createNativeStackNavigator<SellerStackParamList>();

const sharedScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { color: colors.textPrimary },
  contentStyle: { backgroundColor: colors.background },
};

/**
 * Árbol de navegación raíz.
 *
 * Prioridad:
 *  1. isBootingLicense → splash mientras se lee SQLite (muy breve).
 *  2. !licenseKey      → ActivationStack (primera instalación).
 *  3. !user            → AuthStack (login).
 *  4. user.role        → AdminStack | SellerStack.
 *
 * Cuando 'licenseKey' o 'user' cambian, React Navigation desmonta el stack
 * anterior y monta el nuevo automáticamente — sin navigate() manual.
 */
export function RootNavigator() {
  const { user, licenseKey, isBootingLicense } = useAuth();

  // ── 1. Carga inicial ──────────────────────────────────────────────────────
  if (isBootingLicense) {
    return <SplashView />;
  }

  // ── 2. Sin licencia activada → pantalla de activación ────────────────────
  if (!licenseKey) {
    return (
      <ActivationStack.Navigator screenOptions={{ headerShown: false }}>
        <ActivationStack.Screen
          name="LicenseActivation"
          component={LicenseActivationScreen}
        />
      </ActivationStack.Navigator>
    );
  }

  // ── 3. Sin sesión → login ─────────────────────────────────────────────────
  if (!user) {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
      </AuthStack.Navigator>
    );
  }

  // ── 4. Administrador ──────────────────────────────────────────────────────
  if (user.role === 'Administrador') {
    return (
      <AdminStack.Navigator screenOptions={sharedScreenOptions}>
        <AdminStack.Screen
          name="AdminHome"
          component={AdminHomeScreen}
          options={{ title: 'Administración' }}
        />
        <AdminStack.Screen
          name="ProductsList"
          component={ProductsListScreen}
          options={{ title: 'Catálogo' }}
        />
        <AdminStack.Screen
          name="ProductForm"
          component={ProductFormScreen}
          options={({ route }) => ({
            title: route.params?.productId ? 'Editar producto' : 'Nuevo producto',
          })}
        />
        <AdminStack.Screen
          name="BarcodeScanner"
          component={BarcodeScannerScreen}
          options={{ headerShown: false }}
        />
        <AdminStack.Screen
          name="DailySales"
          component={DailySalesScreen}
          options={{ title: 'Ventas del día' }}
        />
        <AdminStack.Screen
          name="CashControl"
          component={CashControlScreen}
          options={{ title: 'Control de caja' }}
        />
        <AdminStack.Screen
          name="CashHistory"
          component={CashHistoryScreen}
          options={{ title: 'Historial de cajas' }}
        />
        <AdminStack.Screen
          name="CashSessionDetail"
          component={CashSessionDetailScreen}
          options={{ title: 'Detalle del turno' }}
        />
        <AdminStack.Screen
          name="Vendors"
          component={VendorsScreen}
          options={{ title: 'Cajeros (Vendedores)' }}
        />
        <AdminStack.Screen
          name="LowStock"
          component={LowStockScreen}
          options={{ title: 'Stock mínimo' }}
        />
        <AdminStack.Screen
          name="TopProducts"
          component={TopProductsScreen}
          options={{ title: 'Top productos' }}
        />
        <AdminStack.Screen
          name="SalesByEmployee"
          component={SalesByEmployeeScreen}
          options={{ title: 'Ventas por empleado' }}
        />
        <AdminStack.Screen
          name="SalesTrends"
          component={SalesTrendsScreen}
          options={{ title: 'Tendencia de ventas' }}
        />
        <AdminStack.Screen
          name="TicketSettings"
          component={TicketSettingsScreen}
          options={{ title: 'Ticket e impresora' }}
        />
      </AdminStack.Navigator>
    );
  }

  // ── 5. Vendedor / Cajero ──────────────────────────────────────────────────
  return (
    <SellerStack.Navigator
      screenOptions={{ ...sharedScreenOptions, headerShown: false }}>
      <SellerStack.Screen name="SellerHome" component={SellerHomeScreen} />
    </SellerStack.Navigator>
  );
}

/** Splash mínimo mientras se lee la base de datos local al arrancar. */
function SplashView() {
  return (
    <View style={splashStyles.root}>
      <Text style={splashStyles.title}>TPV</Text>
      <Text style={splashStyles.tagline}>Tu abarrotería, en orden.</Text>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brandRed,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    color: colors.brandCream,
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 8,
  },
  tagline: {
    color: colors.brandCream,
    opacity: 0.8,
    fontSize: 15,
    fontWeight: '400',
  },
});
