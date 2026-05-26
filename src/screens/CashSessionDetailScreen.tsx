import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { getSessionById, getSessionSummary, listMovements } from '../database/cashRepo';
import type { CashMovementRow, CashSessionRow, CashSessionSummary } from '../database/models';
import {
  getSaleItems,
  listSalesBySessionWithSeller,
  type SaleItemDetailRow,
  type SaleWithSellerRow,
} from '../database/salesRepo';
import type { AdminStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';

type Props = NativeStackScreenProps<AdminStackParamList, 'CashSessionDetail'>;
type Tab = 'ventas' | 'movimientos';

export function CashSessionDetailScreen({ route }: Props) {
  const sessionId = route.params.sessionId;
  const [session, setSession] = useState<CashSessionRow | null>(null);
  const [summary, setSummary] = useState<CashSessionSummary | null>(null);
  const [sales, setSales] = useState<SaleWithSellerRow[]>([]);
  const [movements, setMovements] = useState<CashMovementRow[]>([]);
  const [tab, setTab] = useState<Tab>('ventas');

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [items, setItems] = useState<Record<number, SaleItemDetailRow[]>>({});

  const load = useCallback(() => {
    const s = getSessionById(sessionId);
    setSession(s);
    if (s) {
      setSales(listSalesBySessionWithSeller(s.id));
      setMovements(listMovements(s.id));
      setSummary(getSessionSummary(s.id));
    }
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const headerKpis = useMemo(() => {
    if (!session || !summary) return null;
    const expected = session.expected_amount ?? summary.expectedCash;
    const counted = session.counted_amount;
    const diff = session.difference ?? (counted != null ? counted - expected : null);
    return { expected, counted, diff };
  }, [session, summary]);

  const toggleExpand = (saleId: number) => {
    if (expandedId === saleId) {
      setExpandedId(null);
      return;
    }
    if (!items[saleId]) {
      setItems(prev => ({ ...prev, [saleId]: getSaleItems(saleId) }));
    }
    setExpandedId(saleId);
  };

  if (!session) {
    return (
      <Screen contentStyle={styles.content}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Turno no encontrado</Text>
          <Text style={styles.emptyBody}>
            Es posible que se haya eliminado o que haya un problema con la base.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Turno #{session.id}</Text>
          <Text
            style={[
              styles.badge,
              session.status === 'closed' ? styles.badgeClosed : styles.badgeOpen,
            ]}>
            {session.status === 'closed' ? 'CERRADA' : 'ABIERTA'}
          </Text>
        </View>
        <Text style={styles.headerMeta}>Abierta: {formatDateTime(session.opened_at)}</Text>
        {session.closed_at ? (
          <Text style={styles.headerMeta}>Cerrada: {formatDateTime(session.closed_at)}</Text>
        ) : null}

        {summary ? (
          <View style={styles.kpiRow}>
            <Kpi label="Ventas efectivo" value={formatCurrency(summary.cashSalesTotal)} />
            <Kpi label="Tickets" value={String(summary.cashSalesCount)} />
            <Kpi label="Esperado" value={formatCurrency(summary.expectedCash)} />
          </View>
        ) : null}

        {headerKpis && session.status === 'closed' ? (
          <View style={styles.closeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.closeLabel}>Cierre</Text>
              <Text style={styles.closeMeta}>
                Esperado {formatCurrency(headerKpis.expected)} · Contado{' '}
                {headerKpis.counted != null ? formatCurrency(headerKpis.counted) : '—'}
              </Text>
            </View>
            <Text
              style={[
                styles.closeDiff,
                headerKpis.diff == null
                  ? { color: colors.textPrimary }
                  : headerKpis.diff === 0
                    ? { color: colors.textPrimary }
                    : headerKpis.diff > 0
                      ? { color: colors.success }
                      : { color: colors.danger },
              ]}>
              {headerKpis.diff == null
                ? '—'
                : headerKpis.diff === 0
                  ? 'Cuadre'
                  : headerKpis.diff > 0
                    ? `+${formatCurrency(headerKpis.diff)}`
                    : `-${formatCurrency(Math.abs(headerKpis.diff))}`}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.segment}>
        <SegmentButton label="Ventas" active={tab === 'ventas'} onPress={() => setTab('ventas')} />
        <SegmentButton
          label="Movimientos"
          active={tab === 'movimientos'}
          onPress={() => setTab('movimientos')}
        />
      </View>

      {tab === 'ventas' ? (
        <FlatList
          data={sales}
          keyExtractor={s => String(s.id)}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Sin ventas en este turno</Text>
              <Text style={styles.emptyBody}>
                Cuando el cajero cobre, los tickets aparecerán aquí.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.saleCard}>
              <Pressable onPress={() => toggleExpand(item.id)} style={styles.saleHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.saleTitle}>Ticket #{item.id}</Text>
                  <Text style={styles.saleMeta}>
                    {formatTime(item.created_at)} · Cajero: {item.seller_display}
                  </Text>
                </View>
                <Text style={styles.saleAmount}>{formatCurrency(item.total)}</Text>
              </Pressable>
              {expandedId === item.id ? (
                <View style={styles.saleDetails}>
                  {(items[item.id] ?? []).map(d => (
                    <View key={d.id} style={styles.detailLine}>
                      <Text style={styles.detailQty}>{d.quantity}×</Text>
                      <Text style={styles.detailName} numberOfLines={2}>
                        {d.product_name}
                      </Text>
                      <Text style={styles.detailSubtotal}>{formatCurrency(d.subtotal)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={movements}
          keyExtractor={m => String(m.id)}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Sin movimientos</Text>
              <Text style={styles.emptyBody}>
                Entradas y salidas manuales aparecerán aquí.
              </Text>
            </View>
          }
          renderItem={({ item }) => <MovementCard movement={item} />}
        />
      )}
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
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiBox}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function MovementCard({ movement }: { movement: CashMovementRow }) {
  const isIn = movement.type === 'in';
  return (
    <View style={styles.movementCard}>
      <Text style={[styles.movementType, { color: isIn ? colors.success : colors.danger }]}>
        {isIn ? 'ENTRADA' : 'SALIDA'}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.movementReason} numberOfLines={2}>
          {movement.reason ?? 'Sin motivo'}
        </Text>
        <Text style={styles.movementMeta}>{formatTime(movement.created_at)}</Text>
      </View>
      <Text style={[styles.movementAmount, { color: isIn ? colors.success : colors.danger }]}>
        {isIn ? '+' : '−'}
        {formatCurrency(movement.amount)}
      </Text>
    </View>
  );
}

function formatTime(iso: string): string {
  const safe = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z';
  const date = new Date(safe);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string): string {
  const safe = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z';
  const date = new Date(safe);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-MX', {
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
  headerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerTitle: {
    ...typography.title,
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
  headerMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  kpiBox: {
    flex: 1,
    minWidth: 110,
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
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  closeRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  closeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  closeMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeDiff: {
    ...typography.subtitle,
    fontWeight: '900',
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
  saleCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  saleHeader: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  saleTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  saleMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  saleAmount: {
    ...typography.subtitle,
    color: colors.success,
    fontWeight: '900',
  },
  saleDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg,
    gap: spacing.sm,
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
  movementCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  movementType: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '900',
    minWidth: 70,
  },
  movementReason: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  movementMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  movementAmount: {
    ...typography.subtitle,
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

