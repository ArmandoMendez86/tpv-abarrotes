import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import {
  getTopProductsByRevenue,
  getTopProductsByUnits,
  type TopProductRow,
} from '../database/productsRepo';
import { colors, radii, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';

type Mode = 'revenue' | 'units';
type TopSize = 5 | 10;

export function TopProductsScreen() {
  const [mode, setMode] = useState<Mode>('revenue');
  const [topSize, setTopSize] = useState<TopSize>(10);
  const [rows, setRows] = useState<TopProductRow[]>([]);

  const refresh = useCallback(() => {
    const date = todayIso();
    const data =
      mode === 'revenue'
        ? getTopProductsByRevenue(date, topSize)
        : getTopProductsByUnits(date, topSize);
    setRows(data);
  }, [mode, topSize]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const title = useMemo(() => {
    return mode === 'revenue'
      ? `Top ${topSize} por dinero`
      : `Top ${topSize} por movimiento`;
  }, [mode, topSize]);

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Top productos</Text>
        <Text style={styles.subtitle}>
          Ranking de hoy (ventas registradas en SQLite).
        </Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.segment}>
          <SegmentButton
            label="Dinero"
            active={mode === 'revenue'}
            onPress={() => setMode('revenue')}
          />
          <SegmentButton
            label="Unidades"
            active={mode === 'units'}
            onPress={() => setMode('units')}
          />
        </View>
        <View style={styles.segment}>
          <SegmentButton
            label="Top 5"
            active={topSize === 5}
            onPress={() => setTopSize(5)}
          />
          <SegmentButton
            label="Top 10"
            active={topSize === 10}
            onPress={() => setTopSize(10)}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{title}</Text>

      <FlatList
        data={rows}
        keyExtractor={r => String(r.product_id)}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aún sin datos</Text>
            <Text style={styles.emptyBody}>
              Cuando cobres ventas, aquí verás qué productos se mueven más.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.rowCard}>
            <View style={styles.rank}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {item.units} u · {formatCurrency(item.revenue)}
              </Text>
            </View>
            <View style={styles.valueBox}>
              <Text style={styles.valueLabel}>
                {mode === 'revenue' ? 'Dinero' : 'Unidades'}
              </Text>
              <Text style={styles.value}>
                {mode === 'revenue'
                  ? formatCurrency(item.revenue)
                  : `${item.units}`}
              </Text>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentBtn,
        active && styles.segmentBtnActive,
        pressed && { opacity: 0.9 },
      ]}
      accessibilityRole="button">
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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
  controls: {
    gap: spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  segmentBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  segmentLabel: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  segmentLabelActive: {
    color: colors.textPrimary,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '800',
  },
  rowCard: {
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
  rank: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    fontWeight: '900',
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
  valueBox: {
    alignItems: 'flex-end',
    minWidth: 110,
  },
  valueLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    ...typography.subtitle,
    color: colors.success,
    fontWeight: '900',
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

