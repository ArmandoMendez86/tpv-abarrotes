import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CartLine } from '../cart/useCart';
import { Button } from '../components/Button';
import { colors, radii, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';

type Props = {
  lines: CartLine[];
  total: number;
  itemCount: number;
  onIncrement: (productId: number) => void;
  onDecrement: (productId: number) => void;
  onRemove: (productId: number) => void;
  onCheckout: () => void;
  onClear: () => void;
  /** El botón Cobrar muestra un spinner durante la transacción. */
  checkoutLoading?: boolean;
};

/**
 * Panel del ticket actual. Visible siempre durante la venta:
 *  - Lista de renglones con stepper [-] [qty] [+] y botón eliminar.
 *  - Resumen con total grande y count de artículos.
 *  - Botón verde "Cobrar" gigante: la acción más importante de la app.
 */
export function CartPanel({
  lines,
  total,
  itemCount,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
  onClear,
  checkoutLoading = false,
}: Props) {
  const isEmpty = lines.length === 0;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ticket actual</Text>
        {!isEmpty ? (
          <Pressable onPress={onClear} hitSlop={10}>
            <Text style={styles.clearLink}>Vaciar</Text>
          </Pressable>
        ) : null}
      </View>

      {isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Carrito vacío</Text>
          <Text style={styles.emptyBody}>
            Toca un producto del catálogo para empezar a cobrar.
          </Text>
        </View>
      ) : (
        <FlatList
          data={lines}
          keyExtractor={l => String(l.productId)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <CartRow
              line={item}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onRemove={onRemove}
            />
          )}
        />
      )}

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {itemCount} artículo{itemCount === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
        <Button
          label="Cobrar"
          variant="success"
          onPress={onCheckout}
          disabled={isEmpty}
          loading={checkoutLoading}
          style={{ marginTop: spacing.md }}
        />
      </View>
    </View>
  );
}

function CartRow({
  line,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  line: CartLine;
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const subtotal = line.unitPrice * line.quantity;
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.rowName} numberOfLines={2}>
          {line.name}
        </Text>
        <Pressable
          onPress={() => onRemove(line.productId)}
          hitSlop={10}
          accessibilityLabel={`Quitar ${line.name}`}>
          <Text style={styles.removeLabel}>Quitar</Text>
        </Pressable>
      </View>
      <View style={styles.rowBottom}>
        <View style={styles.stepper}>
          <Pressable
            style={styles.stepBtn}
            onPress={() => onDecrement(line.productId)}
            accessibilityLabel="Disminuir">
            <Text style={styles.stepBtnLabel}>−</Text>
          </Pressable>
          <Text style={styles.stepCount}>{line.quantity}</Text>
          <Pressable
            style={styles.stepBtn}
            onPress={() => onIncrement(line.productId)}
            accessibilityLabel="Aumentar">
            <Text style={styles.stepBtnLabel}>+</Text>
          </Pressable>
        </View>
        <View style={styles.rowPrice}>
          <Text style={styles.rowUnit}>
            {formatCurrency(line.unitPrice)} c/u
          </Text>
          <Text style={styles.rowSubtotal}>{formatCurrency(subtotal)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  clearLink: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
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
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  row: {
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  rowName: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    flex: 1,
  },
  removeLabel: {
    ...typography.caption,
    color: colors.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: 4,
    gap: 4,
  },
  stepBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtnLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepCount: {
    minWidth: 36,
    textAlign: 'center',
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  rowPrice: {
    alignItems: 'flex-end',
  },
  rowUnit: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rowSubtotal: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  summary: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  totalLabel: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  totalValue: {
    ...typography.amount,
    color: colors.textPrimary,
  },
});
