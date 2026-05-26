import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import {
  listCashSessionsByDate,
  type CashSessionHistoryRow,
  type DateRange,
} from '../database/reportsRepo';
import type { AdminStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';

type Props = NativeStackScreenProps<AdminStackParamList, 'CashHistory'>;

export function CashHistoryScreen(_props: Props) {
  const { navigation } = _props;
  const [from, setFrom] = useState<string>(() => daysAgoIso(7));
  const [to, setTo] = useState<string>(() => todayIso());
  const [rows, setRows] = useState<CashSessionHistoryRow[]>([]);

  const range = useMemo<DateRange>(
    () => ({ from: normalizeIso(from) ?? daysAgoIso(7), to: normalizeIso(to) ?? todayIso() }),
    [from, to],
  );

  const refresh = useCallback(() => {
    setRows(listCashSessionsByDate(range));
  }, [range]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const totalSales = useMemo(
    () => rows.reduce((acc, r) => acc + (r.sales_total ?? 0), 0),
    [rows],
  );

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial de cajas</Text>
        <Text style={styles.subtitle}>
          Consulta turnos anteriores por fecha (apertura/cierre y ventas del turno).
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
        <View style={styles.kpiLine}>
          <Text style={styles.kpiLabel}>Total ventas en rango</Text>
          <Text style={styles.kpiValue}>{formatCurrency(totalSales)}</Text>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={r => String(r.id)}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin turnos en este rango</Text>
            <Text style={styles.emptyBody}>
              Ajusta las fechas para ver cajas anteriores.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard
            row={item}
            onPress={() => navigation.navigate('CashSessionDetail', { sessionId: item.id })}
          />
        )}
      />
    </Screen>
  );
}

function SessionCard({ row, onPress }: { row: CashSessionHistoryRow; onPress: () => void }) {
  const isClosed = row.status === 'closed';
  const when = isClosed ? row.closed_at : row.opened_at;
  const diff = row.difference ?? 0;
  const diffLabel =
    !isClosed
      ? 'Abierta'
      : diff === 0
        ? 'Cuadre exacto'
        : diff > 0
          ? `Sobrante ${formatCurrency(diff)}`
          : `Faltante ${formatCurrency(Math.abs(diff))}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.sessionCard, pressed && { opacity: 0.92 }]}
      accessibilityRole="button">
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionTitle}>Turno #{row.id}</Text>
        <Text style={[styles.badge, isClosed ? styles.badgeClosed : styles.badgeOpen]}>
          {isClosed ? 'CERRADA' : 'ABIERTA'}
        </Text>
      </View>

      <Text style={styles.sessionMeta}>
        {isClosed ? 'Cerrada' : 'Abierta'} · {formatDateTime(when)}
      </Text>
      <Text style={styles.sessionMeta}>
        Abrió: {row.opened_by_name}
        {row.closed_by_name ? ` · Cerró: ${row.closed_by_name}` : ''}
      </Text>

      <View style={styles.sessionKpis}>
        <Kpi label="Ventas" value={formatCurrency(row.sales_total)} />
        <Kpi label="Tickets" value={String(row.sales_count)} />
        <Kpi label="Fondo" value={formatCurrency(row.opening_amount)} />
      </View>

      {isClosed ? (
        <View style={styles.diffLine}>
          <Text style={styles.diffLabel}>Resultado</Text>
          <Text
            style={[
              styles.diffValue,
              diff === 0
                ? { color: colors.textPrimary }
                : diff > 0
                  ? { color: colors.success }
                  : { color: colors.danger },
            ]}>
            {diffLabel}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.9 }]} accessibilityRole="button">
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

function setRangePreset(daysBack: number, setFrom: (v: string) => void, setTo: (v: string) => void) {
  const to = todayIso();
  const from = daysBack === 0 ? to : daysAgoIso(daysBack);
  setFrom(from);
  setTo(to);
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiBox}>
      <Text style={styles.kpiBoxLabel}>{label}</Text>
      <Text style={styles.kpiBoxValue} numberOfLines={1}>
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

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const safe = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z';
  const d = new Date(safe);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  kpiLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  kpiLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  kpiValue: {
    ...typography.subtitle,
    color: colors.success,
    fontWeight: '900',
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  sessionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  badge: {
    ...typography.caption,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    overflow: 'hidden',
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  badgeOpen: {
    backgroundColor: '#FFFBEB',
    color: colors.warning,
  },
  badgeClosed: {
    backgroundColor: '#ECFDF5',
    color: colors.success,
  },
  sessionMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sessionKpis: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  kpiBox: {
    flex: 1,
    minWidth: 110,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 2,
  },
  kpiBoxLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  kpiBoxValue: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  diffLine: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diffLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  diffValue: {
    ...typography.bodyStrong,
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

