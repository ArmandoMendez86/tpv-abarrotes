import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/useCart';
import { CartPanel } from '../components/CartPanel';
import { CashPaymentModal } from '../components/CashPaymentModal';
import { ProductGrid } from '../components/ProductGrid';
import type { ProductRow } from '../database/models';
import {
  createSale,
  getSaleItems,
  getSaleTotalsOfDay,
  listSalesOfDayWithSeller,
  type SaleItemDetailRow,
  type SaleWithSellerRow,
} from '../database/salesRepo';
import { getTicketSettings } from '../database/settingsRepo';
import {
  connectPrinter,
  disconnectPrinter,
  printSaleTicket,
} from '../printing/bluetoothPrinter';
import { colors, radii, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';

const SIDE_BY_SIDE_BREAKPOINT = 720;

/**
 * Pantalla principal del vendedor: el Punto de Venta.
 *
 * Diseño:
 *  - En tablets (>=720dp): catálogo a la izquierda (60%), carrito a la derecha (40%).
 *  - En teléfonos: catálogo arriba, carrito en una hoja inferior expandible
 *    (resumen siempre visible con el botón Cobrar gigante).
 *
 * Flujo de cobro:
 *  1. Cajero agrega productos -> useCart actualiza líneas y total.
 *  2. Toca "Cobrar" -> abre CashPaymentModal.
 *  3. Confirmar -> llama salesRepo.createSale (transaccional: ventas +
 *     detalle_ventas + descuento de stock). Si falla, se muestra error y el
 *     carrito permanece intacto. Si tiene éxito, se limpia y se anuncia.
 */
export function SellerHomeScreen() {
  const { user, signOut, licenseWarning } = useAuth();
  const { width } = useWindowDimensions();
  const sideBySide = width >= SIDE_BY_SIDE_BREAKPOINT;

  const cart = useCart();
  const [cartExpanded, setCartExpanded] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [salesVisible, setSalesVisible] = useState(false);
  const [salesRefreshKey, setSalesRefreshKey] = useState(0);

  const quantitiesById = useMemo(() => {
    const map: Record<number, number> = {};
    cart.lines.forEach(l => {
      map[l.productId] = l.quantity;
    });
    return map;
  }, [cart.lines]);

  const handlePickProduct = (product: ProductRow) => {
    cart.addProduct(product);
  };

  const openPayment = () => {
    if (cart.lines.length === 0) {
      return;
    }
    setPaymentVisible(true);
  };

  const doPrint = async (
    saleId: number,
    lines: typeof cart.lines,
    total: number,
    cashReceived: number | null,
    changeGiven: number | null,
  ) => {
    const settings = getTicketSettings();
    if (settings.printerMode !== 'bluetooth' || !settings.btDeviceId) {
      Alert.alert('Sin impresora', 'Configura una impresora Bluetooth en Ajustes.');
      return;
    }
    try {
      await connectPrinter(settings.btDeviceId);
      await printSaleTicket({ saleId, lines, total, cashReceived, changeGiven, settings });
      await disconnectPrinter();
      Alert.alert('Ticket impreso', `Ticket #${saleId} enviado a la impresora.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al imprimir.';
      Alert.alert('No se pudo imprimir', msg);
    }
  };

  const handleConfirm = async (cashReceived: number | null) => {
    if (!user || cart.lines.length === 0) {
      return;
    }
    setSubmitting(true);
    try {
      const saleLines = cart.lines.slice();
      const result = await createSale({
        userId: user.id,
        paymentMethod: 'efectivo',
        cashReceived: cashReceived ?? undefined,
        items: saleLines.map(l => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      });

      cart.clear();
      setPaymentVisible(false);
      setCartExpanded(false);
      setSalesRefreshKey(k => k + 1);

      const settings = getTicketSettings();
      const hasPrinter = settings.printerMode === 'bluetooth' && !!settings.btDeviceId;
      const changeMsg =
        result.changeGiven != null
          ? `\nCambio: ${formatCurrency(result.changeGiven)}`
          : '';

      Alert.alert(
        'Venta registrada',
        `Ticket #${result.saleId}\nTotal: ${formatCurrency(result.total)}${changeMsg}`,
        hasPrinter
          ? [
              { text: 'Omitir', style: 'cancel' },
              {
                text: 'Imprimir ticket',
                onPress: () =>
                  doPrint(
                    result.saleId,
                    saleLines,
                    result.total,
                    cashReceived,
                    result.changeGiven,
                  ),
              },
            ]
          : [{ text: 'OK' }],
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error desconocido al cobrar.';
      Alert.alert('No se pudo registrar la venta', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.surface}
        translucent={false}
      />
      {licenseWarning ? (
        <OfflineBanner hoursLeft={licenseWarning.hoursLeft} />
      ) : null}
      <View style={styles.topBar}>
        <View style={styles.topBarText}>
          <Text style={styles.greeting} numberOfLines={1}>
            Caja · {user?.username}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Listo para cobrar
          </Text>
        </View>
        <View style={styles.topBarActions}>
          <Pressable
            onPress={() => setSalesVisible(true)}
            style={({ pressed }) => [
              styles.historyBtn,
              pressed && { backgroundColor: colors.surfaceMuted },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ver mis ventas del día"
            hitSlop={8}>
            <Text style={styles.historyLabel}>Mis ventas</Text>
          </Pressable>
          <Pressable
            onPress={signOut}
            style={({ pressed }) => [
              styles.logoutBtn,
              pressed && { backgroundColor: colors.surfaceMuted },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            hitSlop={8}>
            <Text style={styles.logoutLabel}>Salir</Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {sideBySide ? (
          <View style={styles.row}>
            <View style={styles.gridSide}>
              <ProductGrid
                onPickProduct={handlePickProduct}
                quantitiesById={quantitiesById}
              />
            </View>
            <View style={styles.cartSide}>
              <CartPanel
                lines={cart.lines}
                total={cart.total}
                itemCount={cart.itemCount}
                onIncrement={cart.increment}
                onDecrement={cart.decrement}
                onRemove={cart.removeLine}
                onClear={cart.clear}
                onCheckout={openPayment}
                checkoutLoading={submitting}
              />
            </View>
          </View>
        ) : (
          <View style={styles.flex}>
            <View style={styles.gridStacked}>
              <ProductGrid
                onPickProduct={handlePickProduct}
                quantitiesById={quantitiesById}
              />
            </View>
            {cartExpanded ? (
              <View style={styles.cartExpanded}>
                <CartPanel
                  lines={cart.lines}
                  total={cart.total}
                  itemCount={cart.itemCount}
                  onIncrement={cart.increment}
                  onDecrement={cart.decrement}
                  onRemove={cart.removeLine}
                  onClear={cart.clear}
                  onCheckout={openPayment}
                  checkoutLoading={submitting}
                />
                <Pressable
                  onPress={() => setCartExpanded(false)}
                  style={styles.collapseHandle}
                  accessibilityRole="button"
                  accessibilityLabel="Colapsar carrito">
                  <Text style={styles.collapseLabel}>Ocultar carrito</Text>
                </Pressable>
              </View>
            ) : (
              <CartPreview
                itemCount={cart.itemCount}
                total={cart.total}
                onExpand={() => setCartExpanded(true)}
                onCheckout={openPayment}
              />
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      <CashPaymentModal
        visible={paymentVisible}
        total={cart.total}
        onCancel={() => setPaymentVisible(false)}
        onConfirm={handleConfirm}
        loading={submitting}
      />

      {user ? (
        <SellerSalesModal
          visible={salesVisible}
          userId={user.id}
          refreshKey={salesRefreshKey}
          onClose={() => setSalesVisible(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Banner de advertencia offline
// ---------------------------------------------------------------------------

function OfflineBanner({ hoursLeft }: { hoursLeft: number }) {
  const critical = hoursLeft <= 8;
  return (
    <View style={critical ? styles.bannerCritical : styles.bannerWarn}>
      <Text style={styles.bannerText} numberOfLines={1}>
        {critical
          ? `Sin servidor · la app se bloqueará en ${hoursLeft}h si no hay internet`
          : `Modo offline · ${hoursLeft}h restantes antes de requerir conexión`}
      </Text>
    </View>
  );
}

/**
 * Versión compacta del carrito para teléfono. Se ancla al fondo de la pantalla
 * y muestra siempre el total con el botón gigante "Cobrar"; tocar en cualquier
 * otra parte del bloque expande el carrito completo.
 */
function CartPreview({
  itemCount,
  total,
  onExpand,
  onCheckout,
}: {
  itemCount: number;
  total: number;
  onExpand: () => void;
  onCheckout: () => void;
}) {
  const isEmpty = itemCount === 0;
  return (
    <View style={styles.preview}>
      <Pressable
        style={styles.previewSummary}
        onPress={onExpand}
        accessibilityRole="button"
        accessibilityLabel="Ver carrito">
        <View>
          <Text style={styles.previewLabel}>
            {isEmpty
              ? 'Carrito vacío'
              : `${itemCount} artículo${itemCount === 1 ? '' : 's'}`}
          </Text>
          <Text style={styles.previewTotal}>{formatCurrency(total)}</Text>
        </View>
        {!isEmpty ? (
          <Text style={styles.previewLink}>Ver detalle</Text>
        ) : null}
      </Pressable>
      <Pressable
        onPress={onCheckout}
        disabled={isEmpty}
        style={({ pressed }) => [
          styles.checkoutBig,
          pressed && { backgroundColor: colors.successPressed },
          isEmpty && { opacity: 0.5 },
        ]}
        accessibilityRole="button">
        <Text style={styles.checkoutBigLabel}>Cobrar</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Modal "Mis ventas del día"
// ---------------------------------------------------------------------------

function SellerSalesModal({
  visible,
  userId,
  refreshKey,
  onClose,
}: {
  visible: boolean;
  userId: number;
  refreshKey: number;
  onClose: () => void;
}) {
  const [sales, setSales] = useState<SaleWithSellerRow[]>([]);
  const [totals, setTotals] = useState({ count: 0, total: 0 });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<number, SaleItemDetailRow[]>>({});
  const [printingId, setPrintingId] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSales(listSalesOfDayWithSeller(undefined, userId));
    setTotals(getSaleTotalsOfDay(undefined, userId));
    setExpandedId(null);
    setItemsCache({});
  }, [visible, userId, refreshKey]);

  const toggleExpand = (saleId: number) => {
    if (expandedId === saleId) {
      setExpandedId(null);
      return;
    }
    if (!itemsCache[saleId]) {
      setItemsCache(prev => ({ ...prev, [saleId]: getSaleItems(saleId) }));
    }
    setExpandedId(saleId);
  };

  const handleReprint = async (sale: SaleWithSellerRow) => {
    const settings = getTicketSettings();
    if (settings.printerMode !== 'bluetooth' || !settings.btDeviceId) {
      Alert.alert('Sin impresora', 'Configura una impresora Bluetooth en Ajustes de ticket.');
      return;
    }
    const saleItems = itemsCache[sale.id] ?? getSaleItems(sale.id);
    if (!itemsCache[sale.id]) {
      setItemsCache(prev => ({ ...prev, [sale.id]: saleItems }));
    }
    const lines = saleItems.map(d => ({
      productId: d.producto_id,
      barcode: null as string | null,
      name: d.product_name,
      unitPrice: d.unit_price,
      quantity: d.quantity,
    }));
    setPrintingId(sale.id);
    try {
      await connectPrinter(settings.btDeviceId);
      await printSaleTicket({
        saleId: sale.id,
        lines,
        total: sale.total,
        cashReceived: sale.cash_received,
        changeGiven: sale.change_given,
        settings,
      });
      await disconnectPrinter();
      Alert.alert('Ticket impreso', `Ticket #${sale.id} enviado a la impresora.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al imprimir.';
      Alert.alert('No se pudo imprimir', msg);
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={false}>
      <SafeAreaView style={mStyles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={mStyles.header}>
          <View>
            <Text style={mStyles.title}>Mis ventas de hoy</Text>
            <Text style={mStyles.subtitle}>
              {totals.count} ticket{totals.count === 1 ? '' : 's'} · {formatCurrency(totals.total)}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              mStyles.closeBtn,
              pressed && { backgroundColor: colors.surfaceMuted },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Cerrar">
            <Text style={mStyles.closeLabel}>Cerrar</Text>
          </Pressable>
        </View>

        <FlatList
          data={sales}
          keyExtractor={s => String(s.id)}
          contentContainerStyle={mStyles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <View style={mStyles.empty}>
              <Text style={mStyles.emptyTitle}>Sin ventas registradas</Text>
              <Text style={mStyles.emptyBody}>
                Tus tickets del día aparecerán aquí.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <SellerSaleCard
              sale={item}
              expanded={expandedId === item.id}
              details={itemsCache[item.id] ?? []}
              onToggle={() => toggleExpand(item.id)}
              onReprint={() => handleReprint(item)}
              printing={printingId === item.id}
            />
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

function SellerSaleCard({
  sale,
  expanded,
  details,
  onToggle,
  onReprint,
  printing,
}: {
  sale: SaleWithSellerRow;
  expanded: boolean;
  details: SaleItemDetailRow[];
  onToggle: () => void;
  onReprint: () => void;
  printing: boolean;
}) {
  return (
    <View style={mStyles.card}>
      <Pressable onPress={onToggle} style={mStyles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={mStyles.ticketLabel}>Ticket #{sale.id}</Text>
          <Text style={mStyles.timestamp}>{formatTime(sale.created_at)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={mStyles.totalValue}>{formatCurrency(sale.total)}</Text>
          <Text style={mStyles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={mStyles.details}>
          {details.length === 0 ? (
            <Text style={mStyles.detailHint}>Sin renglones.</Text>
          ) : (
            details.map(d => (
              <View key={d.id} style={mStyles.detailLine}>
                <Text style={mStyles.detailQty}>{d.quantity}×</Text>
                <Text style={mStyles.detailName} numberOfLines={2}>
                  {d.product_name}
                </Text>
                <Text style={mStyles.detailSubtotal}>
                  {formatCurrency(d.subtotal)}
                </Text>
              </View>
            ))
          )}

          {sale.cash_received != null ? (
            <View style={mStyles.cashLine}>
              <Text style={mStyles.cashLabel}>Efectivo</Text>
              <Text style={mStyles.cashValue}>{formatCurrency(sale.cash_received)}</Text>
            </View>
          ) : null}
          {sale.change_given != null ? (
            <View style={mStyles.cashLine}>
              <Text style={mStyles.cashLabel}>Cambio</Text>
              <Text style={mStyles.cashValue}>{formatCurrency(sale.change_given)}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={onReprint}
            disabled={printing}
            style={({ pressed }) => [
              mStyles.reprintBtn,
              pressed && { opacity: 0.7 },
              printing && { opacity: 0.5 },
            ]}
            accessibilityRole="button">
            {printing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : null}
            <Text style={mStyles.reprintLabel}>
              {printing ? 'Imprimiendo...' : 'Reimprimir ticket'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function formatTime(iso: string): string {
  const safe = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z';
  const date = new Date(safe);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    /**
     * Color del SafeAreaView = mismo del topBar para que la zona del status
     * bar (área del notch / íconos de notificación) se vea continua, no
     * marcada con un color diferente.
     */
    backgroundColor: colors.surface,
  },
  flex: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
    minHeight: 64,
  },
  topBarText: {
    flex: 1,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  greeting: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  historyBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLabel: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  logoutBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutLabel: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  gridSide: {
    flex: 6,
  },
  cartSide: {
    flex: 4,
  },
  gridStacked: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  cartExpanded: {
    height: '70%',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  collapseHandle: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  collapseLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  preview: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  previewSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  previewTotal: {
    ...typography.amount,
    color: colors.textPrimary,
  },
  previewLink: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  checkoutBig: {
    backgroundColor: colors.success,
    minHeight: 80,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBigLabel: {
    color: colors.textOnPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bannerWarn: {
    backgroundColor: '#78350f',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  bannerCritical: {
    backgroundColor: '#7f1d1d',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  bannerText: {
    color: '#fef3c7',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});

const mStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
    minHeight: 64,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  ticketLabel: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  totalValue: {
    ...typography.subtitle,
    color: colors.success,
  },
  chevron: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  detailHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  detailLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailQty: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
    minWidth: 36,
  },
  detailName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  detailSubtotal: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  cashLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  cashLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cashValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  reprintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  reprintLabel: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
});
