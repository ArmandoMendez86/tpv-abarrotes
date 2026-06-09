import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getSaleItems,
  getSaleTotalsOfDay,
  type SaleItemDetailRow,
  listSalesOfDayWithSeller,
  type SaleWithSellerRow,
} from '../database/salesRepo';
import { getTicketSettings } from '../database/settingsRepo';
import type { UserRow } from '../database/models';
import { listVendors } from '../database/usersRepo';
import type { AdminStackParamList } from '../navigation/types';
import {
  connectPrinter,
  disconnectPrinter,
  printSaleTicket,
} from '../printing/bluetoothPrinter';
import { colors, radii, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';

type Props = NativeStackScreenProps<AdminStackParamList, 'DailySales'>;

/**
 * Reporte detallado de ventas del día. Muestra un encabezado con totales y
 * abajo cada ticket; el admin puede expandir un ticket para ver sus renglones.
 *
 * Lectura "barata": las consultas usan los índices que creamos en Fase 2
 * (idx_ventas_created_at) y date(?) compara strings, lo cual SQLite resuelve
 * sin escaneo de tabla.
 */
export function DailySalesScreen(_props: Props) {
  const [sales, setSales] = useState<SaleWithSellerRow[]>([]);
  const [totals, setTotals] = useState<{ count: number; total: number }>({
    count: 0,
    total: 0,
  });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [items, setItems] = useState<Record<number, SaleItemDetailRow[]>>({});
  const [vendors, setVendors] = useState<UserRow[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [printingId, setPrintingId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    setVendors(listVendors({ onlyActive: true }));
    setSales(
      listSalesOfDayWithSeller(undefined, selectedVendorId ?? undefined),
    );
    setTotals(getSaleTotalsOfDay(undefined, selectedVendorId ?? undefined));
  }, [selectedVendorId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

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

  const handleReprint = async (sale: SaleWithSellerRow) => {
    const settings = getTicketSettings();
    if (settings.printerMode !== 'bluetooth' || !settings.btDeviceId) {
      Alert.alert('Sin impresora', 'Configura una impresora Bluetooth en Ajustes de ticket.');
      return;
    }

    // Cargar renglones si aún no están en memoria
    const saleItems = items[sale.id] ?? getSaleItems(sale.id);
    if (!items[sale.id]) {
      setItems(prev => ({ ...prev, [sale.id]: saleItems }));
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
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Total vendido hoy</Text>
        <Text style={styles.headerValue}>{formatCurrency(totals.total)}</Text>
        <Text style={styles.headerHint}>
          {totals.count} ticket{totals.count === 1 ? '' : 's'}
        </Text>
      </View>

      <View style={styles.filters}>
        <Text style={styles.filtersLabel}>Filtrar por cajero</Text>
        <View style={styles.chipsRow}>
          <Chip
            label="Todos"
            active={selectedVendorId == null}
            onPress={() => setSelectedVendorId(null)}
          />
          {vendors.map(v => (
            <Chip
              key={v.id}
              label={v.full_name?.trim() ? v.full_name : v.username}
              active={selectedVendorId === v.id}
              onPress={() => setSelectedVendorId(v.id)}
            />
          ))}
        </View>
      </View>

      <FlatList
        data={sales}
        keyExtractor={s => String(s.id)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aún no hay ventas hoy</Text>
            <Text style={styles.emptyBody}>
              Cuando un cajero cobre, los tickets aparecerán aquí.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SaleCard
            sale={item}
            expanded={expandedId === item.id}
            details={items[item.id] ?? []}
            onToggle={() => toggleExpand(item.id)}
            onReprint={() => handleReprint(item)}
            printing={printingId === item.id}
          />
        )}
      />
    </SafeAreaView>
  );
}

function SaleCard({
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
    <View style={styles.card}>
      <Pressable onPress={onToggle} style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ticket}>Ticket #{sale.id}</Text>
          <Text style={styles.timestamp}>{formatTime(sale.created_at)}</Text>
          <Text style={styles.seller}>Cajero: {sale.seller_display}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.totalValue}>{formatCurrency(sale.total)}</Text>
          <Text style={styles.method}>{sale.payment_method}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.detailsBlock}>
          {details.length === 0 ? (
            <Text style={styles.detailsHint}>Sin renglones registrados.</Text>
          ) : (
            details.map(d => (
              <View key={d.id} style={styles.detailLine}>
                <Text style={styles.detailQty}>{d.quantity}×</Text>
                <Text style={styles.detailName} numberOfLines={2}>
                  {d.product_name}
                </Text>
                <Text style={styles.detailSubtotal}>
                  {formatCurrency(d.subtotal)}
                </Text>
              </View>
            ))
          )}

          {sale.cash_received != null ? (
            <View style={styles.cashLine}>
              <Text style={styles.cashLabel}>Efectivo recibido</Text>
              <Text style={styles.cashValue}>
                {formatCurrency(sale.cash_received)}
              </Text>
            </View>
          ) : null}
          {sale.change_given != null ? (
            <View style={styles.cashLine}>
              <Text style={styles.cashLabel}>Cambio</Text>
              <Text style={styles.cashValue}>
                {formatCurrency(sale.change_given)}
              </Text>
            </View>
          ) : null}

          {/* Botón reimprimir */}
          <Pressable
            onPress={onReprint}
            disabled={printing}
            style={({ pressed }) => [
              styles.reprintBtn,
              pressed && { opacity: 0.7 },
              printing && { opacity: 0.5 },
            ]}
            accessibilityRole="button">
            {printing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : null}
            <Text style={styles.reprintLabel}>
              {printing ? 'Imprimiendo…' : 'Reimprimir ticket'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Chip({
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
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.9 },
      ]}
      accessibilityRole="button">
      <Text
        style={[styles.chipLabel, active && styles.chipLabelActive]}
        numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Convierte 'YYYY-MM-DD HH:MM:SS' (UTC, datetime('now') de SQLite) a una hora
 * legible en zona local del dispositivo.
 */
function formatTime(iso: string): string {
  const safe = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z';
  const date = new Date(safe);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    margin: spacing.lg,
    padding: spacing.xl,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: radii.lg,
    gap: spacing.xs,
  },
  headerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerValue: {
    ...typography.amount,
    color: colors.success,
    fontSize: 44,
    lineHeight: 48,
  },
  headerHint: {
    ...typography.body,
    color: colors.textSecondary,
  },
  filters: {
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  filtersLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipsRow: {
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
    backgroundColor: colors.surface,
    minHeight: 44,
    justifyContent: 'center',
    maxWidth: '100%',
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  chipLabel: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
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
    padding: spacing.lg,
    gap: spacing.md,
  },
  ticket: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  seller: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  totalValue: {
    ...typography.subtitle,
    color: colors.success,
  },
  method: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailsBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  detailsHint: {
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
