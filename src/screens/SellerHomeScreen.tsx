import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { createSale } from '../database/salesRepo';
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
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const sideBySide = width >= SIDE_BY_SIDE_BREAKPOINT;

  const cart = useCart();
  const [cartExpanded, setCartExpanded] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleConfirm = async (cashReceived: number | null) => {
    if (!user || cart.lines.length === 0) {
      return;
    }
    setSubmitting(true);
    try {
      const result = await createSale({
        userId: user.id,
        paymentMethod: 'efectivo',
        cashReceived: cashReceived ?? undefined,
        items: cart.lines.map(l => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      });
      cart.clear();
      setPaymentVisible(false);
      setCartExpanded(false);
      const changeMsg =
        result.changeGiven != null
          ? `\nCambio: ${formatCurrency(result.changeGiven)}`
          : '';
      Alert.alert(
        'Venta registrada',
        `Ticket #${result.saleId}\nTotal: ${formatCurrency(result.total)}${changeMsg}`,
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
      <View style={styles.topBar}>
        <View style={styles.topBarText}>
          <Text style={styles.greeting} numberOfLines={1}>
            Caja · {user?.username}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Listo para cobrar
          </Text>
        </View>
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
    </SafeAreaView>
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
  greeting: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
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
});
