import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { CashAmountModal } from '../components/CashAmountModal';
import {
  addMovement,
  closeSession,
  getOpenSession,
  getSessionSummary,
  listMovements,
  openSession,
} from '../database/cashRepo';
import type {
  CashMovementRow,
  CashSessionSummary,
} from '../database/models';
import type { AdminStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';

type Props = NativeStackScreenProps<AdminStackParamList, 'CashControl'>;

type ModalKind = 'open' | 'in' | 'out' | 'close' | null;

/**
 * Pantalla de Control de Caja.
 *
 * Dos estados principales:
 *  1. Sin turno abierto → tarjeta "Caja cerrada" + botón "Abrir caja".
 *  2. Con turno abierto → resumen vivo (esperado, ventas, movimientos),
 *     accesos para registrar entradas/salidas y botón rojo "Cerrar caja".
 *
 * Todas las mutaciones recargan los datos llamando a load(); las pantallas
 * no manejan estado derivado, leen siempre desde SQLite, fuente de verdad.
 */
export function CashControlScreen(_props: Props) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CashSessionSummary | null>(null);
  const [movements, setMovements] = useState<CashMovementRow[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    const session = getOpenSession();
    if (!session) {
      setSummary(null);
      setMovements([]);
      return;
    }
    setSummary(getSessionSummary(session.id));
    setMovements(listMovements(session.id));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // -- Acciones ------------------------------------------------------------

  const handleOpen = async (amount: number, notes: string | null) => {
    if (!user) {
      return;
    }
    setSubmitting(true);
    try {
      openSession({
        userId: user.id,
        openingAmount: amount,
        notes: notes ?? undefined,
      });
      setModal(null);
      load();
    } catch (err: unknown) {
      Alert.alert(
        'No se pudo abrir la caja',
        err instanceof Error ? err.message : 'Error desconocido.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleMovement = async (
    type: 'in' | 'out',
    amount: number,
    reason: string | null,
  ) => {
    if (!user || !summary) {
      return;
    }
    setSubmitting(true);
    try {
      addMovement({
        sessionId: summary.session.id,
        userId: user.id,
        type,
        amount,
        reason: reason ?? undefined,
      });
      setModal(null);
      load();
    } catch (err: unknown) {
      Alert.alert(
        'No se pudo registrar el movimiento',
        err instanceof Error ? err.message : 'Error desconocido.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (counted: number, notes: string | null) => {
    if (!user || !summary) {
      return;
    }
    setSubmitting(true);
    try {
      const result = await closeSession({
        sessionId: summary.session.id,
        countedAmount: counted,
        closedBy: user.id,
        notes: notes ?? undefined,
      });
      setModal(null);
      load();
      const diffLabel =
        result.difference === 0
          ? 'Cuadre exacto.'
          : result.difference > 0
          ? `Sobrante de ${formatCurrency(result.difference)}.`
          : `Faltante de ${formatCurrency(Math.abs(result.difference))}.`;
      Alert.alert(
        'Caja cerrada',
        `Esperado: ${formatCurrency(result.expected)}\nContado: ${formatCurrency(
          counted,
        )}\n${diffLabel}`,
      );
    } catch (err: unknown) {
      Alert.alert(
        'No se pudo cerrar la caja',
        err instanceof Error ? err.message : 'Error desconocido.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // -- Render --------------------------------------------------------------

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['bottom', 'left', 'right']}>
      {summary ? (
        <OpenSessionView
          summary={summary}
          movements={movements}
          onAddIn={() => setModal('in')}
          onAddOut={() => setModal('out')}
          onClose={() => setModal('close')}
        />
      ) : (
        <ClosedView onOpen={() => setModal('open')} />
      )}

      <CashAmountModal
        visible={modal === 'open'}
        title="Abrir caja"
        description="Captura el efectivo con el que inicias el turno (fondo de caja)."
        amountLabel="Fondo de caja"
        showReason
        reasonLabel="Notas (opcional)"
        reasonPlaceholder="Ej. Cambio inicial entregado por el dueño"
        confirmLabel="Abrir caja"
        confirmVariant="success"
        loading={submitting}
        onCancel={() => setModal(null)}
        onConfirm={handleOpen}
      />

      <CashAmountModal
        visible={modal === 'in'}
        title="Entrada de efectivo"
        description="Registra dinero que ingresa a la caja fuera de las ventas."
        amountLabel="Monto que entra"
        showReason
        reasonLabel="Motivo"
        reasonPlaceholder="Ej. Cambio extra, depósito del dueño"
        confirmLabel="Registrar entrada"
        confirmVariant="success"
        loading={submitting}
        onCancel={() => setModal(null)}
        onConfirm={(amount, reason) => handleMovement('in', amount, reason)}
      />

      <CashAmountModal
        visible={modal === 'out'}
        title="Salida de efectivo"
        description="Registra dinero que sale de la caja (pagos, retiros)."
        amountLabel="Monto que sale"
        showReason
        reasonLabel="Motivo"
        reasonPlaceholder="Ej. Pago a proveedor, retiro del dueño"
        confirmLabel="Registrar salida"
        confirmVariant="danger"
        loading={submitting}
        onCancel={() => setModal(null)}
        onConfirm={(amount, reason) => handleMovement('out', amount, reason)}
      />

      <CashAmountModal
        visible={modal === 'close'}
        title="Cerrar caja"
        description="Cuenta físicamente el efectivo en la caja y captura el total."
        amountLabel="Efectivo contado"
        showReason
        reasonLabel="Observaciones del cierre (opcional)"
        reasonPlaceholder="Ej. Falta cambio chico, billete sospechoso, etc."
        confirmLabel="Cerrar caja"
        confirmVariant="danger"
        hint={
          summary
            ? {
                label: 'Esperado en caja',
                value: formatCurrency(summary.expectedCash),
              }
            : null
        }
        loading={submitting}
        onCancel={() => setModal(null)}
        onConfirm={handleClose}
      />
    </SafeAreaView>
  );
}

// -- Vistas --------------------------------------------------------------

function ClosedView({ onOpen }: { onOpen: () => void }) {
  return (
    <View style={styles.closedWrap}>
      <View style={styles.closedCard}>
        <Text style={styles.closedEmoji}>🔒</Text>
        <Text style={styles.closedTitle}>Caja cerrada</Text>
        <Text style={styles.closedBody}>
          Para empezar a cobrar y registrar movimientos, abre el turno con el
          fondo de caja inicial.
        </Text>
      </View>
      <Button label="Abrir caja" variant="success" onPress={onOpen} />
    </View>
  );
}

function OpenSessionView({
  summary,
  movements,
  onAddIn,
  onAddOut,
  onClose,
}: {
  summary: CashSessionSummary;
  movements: CashMovementRow[];
  onAddIn: () => void;
  onAddOut: () => void;
  onClose: () => void;
}) {
  const { session, cashSalesTotal, cashSalesCount, movementsIn, movementsOut, expectedCash } =
    summary;

  return (
    <FlatList
      data={movements}
      keyExtractor={m => String(m.id)}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
          <View style={styles.openBanner}>
            <View style={styles.openDot} />
            <Text style={styles.openBannerText}>
              Turno abierto desde {formatTime(session.opened_at)}
            </Text>
          </View>

          <View style={styles.expectedCard}>
            <Text style={styles.expectedLabel}>Esperado en caja</Text>
            <Text style={styles.expectedValue}>{formatCurrency(expectedCash)}</Text>
            <Text style={styles.expectedHint}>
              Fondo {formatCurrency(session.opening_amount)} + ventas en
              efectivo + entradas − salidas
            </Text>
          </View>

          <View style={styles.statsRow}>
            <Stat label="Ventas en efectivo" value={formatCurrency(cashSalesTotal)} hint={`${cashSalesCount} ticket${cashSalesCount === 1 ? '' : 's'}`} />
            <Stat label="Entradas" value={formatCurrency(movementsIn)} positive />
            <Stat label="Salidas" value={formatCurrency(movementsOut)} negative />
          </View>

          <View style={styles.actionsRow}>
            <Button
              label="+ Entrada"
              variant="success"
              onPress={onAddIn}
              style={styles.actionBtn}
            />
            <Button
              label="− Salida"
              variant="danger"
              onPress={onAddOut}
              style={styles.actionBtn}
            />
          </View>

          <Button label="Cerrar caja" variant="primary" onPress={onClose} />

          <Text style={styles.sectionTitle}>Movimientos del turno</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Sin movimientos manuales</Text>
          <Text style={styles.emptyBody}>
            Cuando registres una entrada o salida, aparecerán aquí.
          </Text>
        </View>
      }
      renderItem={({ item }) => <MovementRow movement={item} />}
    />
  );
}

function Stat({
  label,
  value,
  hint,
  positive,
  negative,
}: {
  label: string;
  value: string;
  hint?: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          positive && { color: colors.success },
          negative && { color: colors.danger },
        ]}>
        {value}
      </Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

function MovementRow({ movement }: { movement: CashMovementRow }) {
  const isIn = movement.type === 'in';
  return (
    <View style={styles.movementCard}>
      <View
        style={[
          styles.movementBadge,
          { backgroundColor: isIn ? '#ECFDF5' : '#FEF2F2' },
        ]}>
        <Text
          style={[
            styles.movementBadgeText,
            { color: isIn ? colors.success : colors.danger },
          ]}>
          {isIn ? 'Entrada' : 'Salida'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.movementReason} numberOfLines={2}>
          {movement.reason ?? (isIn ? 'Sin motivo' : 'Sin motivo')}
        </Text>
        <Text style={styles.movementTime}>{formatTime(movement.created_at)}</Text>
      </View>
      <Text
        style={[
          styles.movementAmount,
          { color: isIn ? colors.success : colors.danger },
        ]}>
        {isIn ? '+' : '−'}
        {formatCurrency(movement.amount)}
      </Text>
    </View>
  );
}

function formatTime(iso: string): string {
  const safe = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z';
  const date = new Date(safe);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closedWrap: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  closedCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  closedEmoji: {
    fontSize: 56,
  },
  closedTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  closedBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  openBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  openDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  openBannerText: {
    ...typography.bodyStrong,
    color: colors.success,
  },
  expectedCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  expectedLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  expectedValue: {
    ...typography.amount,
    color: colors.textPrimary,
    fontSize: 44,
    lineHeight: 48,
  },
  expectedHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  stat: {
    flex: 1,
    minWidth: 110,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 2,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  statHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  movementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  movementBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  movementBadgeText: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  movementReason: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  movementTime: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  movementAmount: {
    ...typography.subtitle,
  },
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
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
