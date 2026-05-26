import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { AdminActionTile } from '../components/AdminActionTile';
import { AppIcon } from '../components/AppIcon';
import { Screen } from '../components/Screen';
import { getOpenSession, getSessionSummary } from '../database/cashRepo';
import type { CashSessionSummary } from '../database/models';
import { countProducts } from '../database/productsRepo';
import { getSaleTotalsOfDay } from '../database/salesRepo';
import type { AdminStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminHome'>;

/**
 * Panel del Administrador. Es el "centro de mando":
 *  - Lee los KPIs del día desde SQLite (productos, ventas, total).
 *  - Da acceso al CRUD de productos y al reporte detallado del día.
 *
 * Usa useFocusEffect para refrescar los KPIs cada vez que el admin vuelve
 * a esta pantalla (ej. tras crear un producto o tras una venta nueva).
 */
export function AdminHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [productsCount, setProductsCount] = useState<number | null>(null);
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [todayTotal, setTodayTotal] = useState<number | null>(null);
  const [cashSummary, setCashSummary] = useState<CashSessionSummary | null>(null);

  const refresh = useCallback(() => {
    setProductsCount(countProducts());
    const totals = getSaleTotalsOfDay();
    setTodayCount(totals.count);
    setTodayTotal(totals.total);

    const session = getOpenSession();
    setCashSummary(session ? getSessionSummary(session.id) : null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <Screen scroll contentStyle={styles.content}>
      <View>
        <Text style={styles.greeting}>
          Hola, {user?.full_name ?? user?.username}
        </Text>
        <Text style={styles.subtitle}>Panel de Administración</Text>
      </View>

      <Text style={styles.sectionHeader}>Caja</Text>
      <Pressable
        onPress={() => navigation.navigate('CashControl')}
        style={({ pressed }) => [
          styles.cashCard,
          cashSummary ? styles.cashCardOpen : styles.cashCardClosed,
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Abrir Control de caja">
        <View style={styles.cashHeader}>
          <View style={styles.cashIcon}>
            <AppIcon
              name={cashSummary ? 'cash-register' : 'cash-lock'}
              size={22}
              color={cashSummary ? colors.warning : colors.textSecondary}
            />
          </View>
          <View
            style={[
              styles.cashDot,
              {
                backgroundColor: cashSummary
                  ? colors.success
                  : colors.textMuted,
              },
            ]}
          />
          <Text style={styles.cashHeaderText}>
            {cashSummary ? 'Caja abierta' : 'Caja cerrada'}
          </Text>
          <Text style={styles.cashHeaderLink}>Gestionar →</Text>
        </View>
        {cashSummary ? (
          <>
            <Text style={styles.cashLabel}>Esperado en caja</Text>
            <Text style={styles.cashValue}>
              {formatCurrency(cashSummary.expectedCash)}
            </Text>
            <Text style={styles.cashHint}>
              Fondo {formatCurrency(cashSummary.session.opening_amount)} ·
              {' '}{cashSummary.cashSalesCount} venta
              {cashSummary.cashSalesCount === 1 ? '' : 's'} en efectivo
            </Text>
          </>
        ) : (
          <Text style={styles.cashHint}>
            Toca para abrir el turno y empezar a registrar ventas y movimientos.
          </Text>
        )}
      </Pressable>

      <AdminActionTile
        title="Caja"
        value="Historial de turnos"
        hint="consultar cajas anteriores por fecha"
        icon={<AppIcon name="history" size={26} color={colors.primary} />}
        onPress={() => navigation.navigate('CashHistory')}
      />

      <Text style={styles.sectionHeader}>Resumen</Text>
      <View style={styles.kpiBlock}>
        <Text style={styles.kpiBlockLabel}>Total vendido hoy</Text>
        <Text style={styles.kpiBlockValue}>
          {todayTotal != null ? formatCurrency(todayTotal) : '—'}
        </Text>
        <Text style={styles.kpiBlockHint}>
          {todayCount ?? 0} ticket{todayCount === 1 ? '' : 's'} cobrado
          {todayCount === 1 ? '' : 's'}
        </Text>
      </View>

      <Text style={styles.sectionHeader}>Accesos</Text>
      <View style={{ gap: spacing.md }}>
        <AdminActionTile
          title="Productos"
          value={`${productsCount?.toLocaleString('es-MX') ?? '—'} en catálogo`}
          hint="alta, edición, precios, stock y código"
          icon={<AppIcon name="package-variant" size={26} color={colors.primary} />}
          onPress={() => navigation.navigate('ProductsList')}
        />
        <AdminActionTile
          title="Ventas"
          value={`Hoy: ${todayCount ?? '—'} ticket${todayCount === 1 ? '' : 's'}`}
          hint="ver tickets del día y totales"
          icon={<AppIcon name="receipt-text" size={26} color={colors.success} />}
          onPress={() => navigation.navigate('DailySales')}
        />
        <AdminActionTile
          title="Cajeros"
          value="Gestionar vendedores"
          hint="alta / baja y PIN rápido"
          icon={<AppIcon name="account-group" size={26} color={colors.primary} />}
          onPress={() => navigation.navigate('Vendors')}
        />
        <AdminActionTile
          title="Inventario"
          value="Stock mínimo"
          hint="ver productos por agotarse"
          icon={<AppIcon name="warehouse" size={26} color={colors.warning} />}
          onPress={() => navigation.navigate('LowStock')}
        />
        <AdminActionTile
          title="Reporte"
          value="Top productos"
          hint="los que más dejan / se mueven"
          icon={<AppIcon name="chart-bar" size={26} color={colors.primary} />}
          onPress={() => navigation.navigate('TopProducts')}
        />
        <AdminActionTile
          title="Reporte"
          value="Por empleado"
          hint="quién vendió cuánto"
          icon={<AppIcon name="account-cash" size={26} color={colors.primary} />}
          onPress={() => navigation.navigate('SalesByEmployee')}
        />
        <AdminActionTile
          title="Gráficas"
          value="Ventas por mes"
          hint="tendencia 12 meses"
          icon={<AppIcon name="chart-line" size={26} color={colors.primary} />}
          onPress={() => navigation.navigate('SalesTrends')}
        />
        <AdminActionTile
          title="Ticket"
          value="Negocio e impresora"
          hint="nombre, dirección, teléfono, despedida"
          icon={<AppIcon name="printer-settings" size={26} color={colors.primary} />}
          onPress={() => navigation.navigate('TicketSettings')}
        />
      </View>

      <Pressable
        onPress={signOut}
        style={({ pressed }) => [
          styles.logoutCard,
          pressed && { opacity: 0.9 },
        ]}
        accessibilityRole="button">
        <Text style={styles.logoutTitle}>Cerrar sesión</Text>
        <Text style={styles.logoutHint}>
          Saldrás del panel y volverás a la pantalla de inicio.
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  greeting: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  sectionHeader: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  kpiBlock: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  kpiBlockLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  kpiBlockValue: {
    ...typography.amount,
    color: colors.success,
    fontSize: 44,
    lineHeight: 48,
  },
  kpiBlockHint: {
    ...typography.body,
    color: colors.textSecondary,
  },
  logoutCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    marginTop: spacing.sm,
    minHeight: 86,
  },
  logoutTitle: {
    ...typography.subtitle,
    color: colors.danger,
    fontWeight: '900',
  },
  logoutHint: {
    ...typography.body,
    color: colors.textSecondary,
  },
  /* --- Tarjeta de estado de caja --------------------------------------- */
  cashCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cashCardOpen: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  cashCardClosed: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  cashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cashIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cashHeaderText: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
    flex: 1,
  },
  cashHeaderLink: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  cashLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
  },
  cashValue: {
    ...typography.amount,
    color: colors.textPrimary,
  },
  cashHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
