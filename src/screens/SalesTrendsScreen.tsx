import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import {
  getMonthlySalesLastN,
  type MonthlySalesRow,
} from '../database/reportsRepo';
import type { AdminStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';

type Props = NativeStackScreenProps<AdminStackParamList, 'SalesTrends'>;

export function SalesTrendsScreen(_props: Props) {
  const [rows, setRows] = useState<MonthlySalesRow[]>([]);

  const refresh = useCallback(() => {
    setRows(getMonthlySalesLastN(12));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const filled = useMemo(() => fillLast12Months(rows), [rows]);
  const max = useMemo(
    () => Math.max(1, ...filled.map(r => r.total)),
    [filled],
  );

  const totalYear = useMemo(
    () => filled.reduce((acc, r) => acc + r.total, 0),
    [filled],
  );

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Tendencia de ventas</Text>
        <Text style={styles.subtitle}>Últimos 12 meses · total {formatCurrency(totalYear)}</Text>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Ventas por mes</Text>
        <Text style={styles.chartHint}>
          Barra más alta = mes con más ventas (solo ventas registradas).
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.barsRow}>
            {filled.map(m => {
              const h = Math.round((m.total / max) * 140);
              return (
                <View key={m.month} style={styles.barWrap}>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { height: h }]} />
                  </View>
                  <Text style={styles.barLabel}>{shortMonth(m.month)}</Text>
                  <Text style={styles.barValue} numberOfLines={1}>
                    {m.total > 0 ? formatCurrency(m.total) : '—'}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

function fillLast12Months(rows: MonthlySalesRow[]): MonthlySalesRow[] {
  const map = new Map(rows.map(r => [r.month, r]));
  const out: MonthlySalesRow[] = [];

  const now = new Date();
  now.setDate(1);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const found = map.get(key);
    out.push(
      found ?? {
        month: key,
        total: 0,
        tickets: 0,
      },
    );
  }
  return out;
}

function shortMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-');
  const month = Number(m);
  const date = new Date(Number(y), Math.max(0, month - 1), 1);
  const label = date.toLocaleDateString('es-MX', { month: 'short' });
  return label.replace('.', '');
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
  chartCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  chartTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  chartHint: {
    ...typography.body,
    color: colors.textSecondary,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  barWrap: {
    width: 86,
    alignItems: 'center',
    gap: 6,
  },
  barBg: {
    width: 56,
    height: 150,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
  },
  barLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '800',
  },
  barValue: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

