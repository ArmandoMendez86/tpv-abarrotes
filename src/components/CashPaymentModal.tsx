import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from './Button';
import { colors, radii, sizes, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';

type Props = {
  visible: boolean;
  total: number;
  onConfirm: (cashReceived: number | null) => void;
  onCancel: () => void;
  loading?: boolean;
};

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

/**
 * Modal para finalizar la venta. Pide el efectivo recibido (opcional) y
 * calcula el cambio en vivo. Si el cajero no captura nada, se asume "exacto"
 * y se confirma con cashReceived = null.
 *
 * Diseño:
 *  - Total enorme arriba.
 *  - Input numérico con teclado de números.
 *  - Atajos rápidos para denominaciones comunes ($50, $100, $200, $500, $1000).
 *  - Cambio calculado y resaltado.
 *  - Dos botones: Cancelar (secundario) y Confirmar venta (success).
 */
export function CashPaymentModal({
  visible,
  total,
  onConfirm,
  onCancel,
  loading,
}: Props) {
  const [cashText, setCashText] = useState('');

  useEffect(() => {
    if (visible) {
      setCashText('');
    }
  }, [visible]);

  const cashReceived = useMemo(() => {
    if (cashText.trim() === '') {
      return null;
    }
    const parsed = Number(cashText.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }, [cashText]);

  const change = cashReceived != null ? cashReceived - total : null;
  const isInsufficient = cashReceived != null && cashReceived < total;

  const confirmEnabled = !loading && (cashReceived == null || !isInsufficient);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdropPress} onPress={onCancel} />
        <View style={styles.card}>
          <Text style={styles.title}>Cobrar venta</Text>

          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>Total a pagar</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>

          <Text style={styles.fieldLabel}>Efectivo recibido (opcional)</Text>
          <TextInput
            value={cashText}
            onChangeText={setCashText}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
          />

          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map(amt => (
              <Pressable
                key={amt}
                onPress={() => setCashText(String(amt))}
                style={({ pressed }) => [
                  styles.quickBtn,
                  pressed && styles.quickBtnPressed,
                ]}>
                <Text style={styles.quickBtnLabel}>${amt}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.changeBlock}>
            <Text style={styles.changeLabel}>Cambio</Text>
            <Text
              style={[
                styles.changeValue,
                isInsufficient && { color: colors.danger },
              ]}>
              {change == null
                ? '—'
                : isInsufficient
                ? `Falta ${formatCurrency(Math.abs(change))}`
                : formatCurrency(change)}
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              label="Cancelar"
              variant="secondary"
              onPress={onCancel}
              disabled={loading}
              style={styles.actionBtn}
            />
            <Button
              label="Confirmar venta"
              variant="success"
              onPress={() => onConfirm(cashReceived)}
              disabled={!confirmEnabled}
              loading={loading}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backdropPress: StyleSheet.absoluteFill,
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  totalBlock: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  totalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  totalValue: {
    ...typography.amount,
    color: colors.textPrimary,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    minHeight: sizes.inputHeight,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quickBtnPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  quickBtnLabel: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  changeBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  changeLabel: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  changeValue: {
    ...typography.title,
    color: colors.success,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
