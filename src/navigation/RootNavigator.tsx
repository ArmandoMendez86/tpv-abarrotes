import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { AdminHomeScreen } from '../screens/AdminHomeScreen';
import { BarcodeScannerScreen } from '../screens/BarcodeScannerScreen';
import { CashHistoryScreen } from '../screens/CashHistoryScreen';
import { CashSessionDetailScreen } from '../screens/CashSessionDetailScreen';
import { CashControlScreen } from '../screens/CashControlScreen';
import { DailySalesScreen } from '../screens/DailySalesScreen';
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
  AdminStackParamList,
  AuthStackParamList,
  SellerStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const SellerStack = createNativeStackNavigator<SellerStackParamList>();

const sharedScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { color: colors.textPrimary },
  contentStyle: { backgroundColor: colors.background },
};

/**
 * Selecciona qué stack montar según el estado de sesión y el rol del usuario.
 * Cuando 'user' cambia (login/logout), React Navigation desmonta el stack
 * anterior automáticamente y monta el nuevo: no necesitamos `navigate('Login')`
 * manual ni `reset` de pila.
 */
export function RootNavigator() {
  const { user } = useAuth();

  if (!user) {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
      </AuthStack.Navigator>
    );
  }

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

  return (
    <SellerStack.Navigator
      screenOptions={{ ...sharedScreenOptions, headerShown: false }}>
      <SellerStack.Screen name="SellerHome" component={SellerHomeScreen} />
    </SellerStack.Navigator>
  );
}
