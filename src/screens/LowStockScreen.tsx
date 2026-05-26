import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import type { ProductRow } from '../database/models';
import { listLowStockProducts } from '../database/productsRepo';
import { colors, radii, spacing, typography } from '../theme/theme';

/**
 * Alerta de stock mínimo: muestra únicamente productos que ya están por debajo
 * (o igual) a su stock mínimo. Diseñada para "lista de compra" rápida.
 */
export function LowStockScreen() {
  const [rows, setRows] = useState<ProductRow[]>([]);

  const refresh = useCallback(() => {
    setRows(listLowStockProducts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const count = rows.length;
  const headerText = useMemo(() => {
    if (count === 0) {
      return 'Todo bien: no hay productos en mínimo.';
    }
    return `${count} producto${count === 1 ? '' : 's'} en stock mínimo`;
  }, [count]);

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Stock mínimo</Text>
        <Text style={styles.subtitle}>{headerText}</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={p => String(p.id)}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin alertas</Text>
            <Text style={styles.emptyBody}>
              Cuando un producto baje a su mínimo, aparecerá aquí.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                Stock: {item.stock} · Mínimo: {item.stock_min}
              </Text>
            </View>
            <View style={styles.badgeWrap}>
              <Text style={styles.badge}>REABASTECER</Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    gap: 2,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeWrap: {
    alignItems: 'flex-end',
  },
  badge: {
    ...typography.caption,
    color: colors.danger,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    overflow: 'hidden',
    fontWeight: '900',
    letterSpacing: 0.6,
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
});

