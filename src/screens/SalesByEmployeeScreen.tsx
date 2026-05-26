import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import {
  getSalesByUser,
  type DateRange,
  type SalesByUserRow,
} from '../database/reportsRepo';
import type { AdminStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';

type Props = NativeStackScreenProps<AdminStackParamList, 'SalesByEmployee'>;

export function SalesByEmployeeScreen(_props: Props) {
  const [from, setFrom] = useState<string>(() => daysAgoIso(7));
  const [to, setTo] = useState<string>(() => todayIso());
  const [rows, setRows] = useState<SalesByUserRow[]>([]);

  const range = useMemo<DateRange>(
    () => ({
      from: normalizeIso(from) ?? daysAgoIso(7),
      to: normalizeIso(to) ?? todayIso(),
    }),
    [from, to],
  );

  const refresh = useCallback(() => {
    setRows(getSalesByUser(range));
  }, [range]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.total += r.total ?? 0;
        acc.tickets += r.tickets ?? 0;
        return acc;
      },
      { total: 0, tickets: 0 },
    );
  }, [rows]);

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Ventas por empleado</Text>
        <Text style={styles.subtitle}>
          Filtra por rango de fechas para ver quién vendió cuánto.
        </Text>
      </View>

      <View style={styles.filtersCard}>
        <Text style={styles.filtersTitle}>Rango de fechas</Text>
        <View style={styles.presetsRow}>
          <Chip label="Hoy" onPress={() => setRangePreset(0, setFrom, setTo)} />
          <Chip label="7 días" onPress={() => setRangePreset(7, setFrom, setTo)} />
          <Chip label="30 días" onPress={() => setRangePreset(30, setFrom, setTo)} />
        </View>
        <View style={styles.filtersRow}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Desde (YYYY-MM-DD)"
              value={from}
              onChangeText={setFrom}
              placeholder="2026-05-01"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Hasta (YYYY-MM-DD)"
              value={to}
              onChangeText={setTo}
              placeholder="2026-05-07"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.kpiRow}>
          <Kpi label="Total" value={formatCurrency(totals.total)} highlight />
          <Kpi label="Tickets" value={String(totals.tickets)} />
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={r => String(r.user_id)}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin ventas en este rango</Text>
            <Text style={styles.emptyBody}>
              Ajusta las fechas para ver resultados.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.rank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.seller_display}
                </Text>
                <Text style={styles.meta}>
                  {item.tickets} ticket{item.tickets === 1 ? '' : 's'}
                </Text>
              </View>
            </View>
            <Text style={styles.amount}>{formatCurrency(item.total)}</Text>
          </View>
        )}
      />
    </Screen>
  );
}

function Kpi({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.kpiBox}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, highlight && { color: colors.success }]}>
        {value}
      </Text>
    </View>
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function normalizeIso(value: string): string | null {
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && { opacity: 0.9 }]}
      accessibilityRole="button">
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

function setRangePreset(
  daysBack: number,
  setFrom: (v: string) => void,
  setTo: (v: string) => void,
) {
  const to = todayIso();
  const from = daysBack === 0 ? to : daysAgoIso(daysBack);
  setFrom(from);
  setTo(to);
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
  filtersCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  filtersTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipLabel: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 2,
  },
  kpiLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  kpiValue: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '900',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
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
  amount: {
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

