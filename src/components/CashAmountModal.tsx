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

type Variant = 'primary' | 'success' | 'danger';

type Props = {
  visible: boolean;
  title: string;
  /** Texto opcional debajo del título (ej. "Monto que deja el dueño en caja"). */
  description?: string;
  /** Etiqueta del campo. */
  amountLabel: string;
  /** Texto del placeholder del input ('0.00' por defecto). */
  amountPlaceholder?: string;
  /** Mostrar campo "Motivo / Observaciones". */
  showReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  /** Bloque informativo opcional (ej. "Esperado en caja: $1,234.50"). */
  hint?: { label: string; value: string } | null;
  /** Atajos rápidos como en CashPaymentModal (opcional). */
  quickAmounts?: number[];
  confirmLabel: string;
  confirmVariant?: Variant;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (amount: number, reason: string | null) => void | Promise<void>;
};

const DEFAULT_QUICK = [50, 100, 200, 500, 1000];

/**
 * Modal reutilizable para capturar un monto con motivo opcional.
 * Lo usan: abrir caja, cerrar caja, entrada y salida de efectivo.
 *
 * Decisiones de UX:
 *  - Input numérico con teclado decimal y autofoco.
 *  - Atajos rápidos para denominaciones comunes (mantiene mismo lenguaje
 *    visual que el modal de cobro del cajero).
 *  - El botón confirmar se deshabilita si no hay un monto válido.
 */
export function CashAmountModal({
  visible,
  title,
  description,
  amountLabel,
  amountPlaceholder = '0.00',
  showReason = false,
  reasonLabel = 'Motivo (opcional)',
  reasonPlaceholder = 'Ej. Pago a proveedor de pan',
  hint = null,
  quickAmounts = DEFAULT_QUICK,
  confirmLabel,
  confirmVariant = 'primary',
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  const [amountText, setAmountText] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (visible) {
      setAmountText('');
      setReason('');
    }
  }, [visible]);

  const amount = useMemo(() => {
    if (amountText.trim() === '') {
      return null;
    }
    const n = Number(amountText.replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [amountText]);

  const canConfirm = !loading && amount != null;

  const handleConfirm = async () => {
    if (amount == null) {
      return;
    }
    await onConfirm(amount, reason.trim() ? reason.trim() : null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={styles.backdropPress}
          onPress={loading ? undefined : onCancel}
        />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}

          {hint ? (
            <View style={styles.hintBlock}>
              <Text style={styles.hintLabel}>{hint.label}</Text>
              <Text style={styles.hintValue}>{hint.value}</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>{amountLabel}</Text>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder={amountPlaceholder}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
          />

          {quickAmounts.length > 0 ? (
            <View style={styles.quickRow}>
              {quickAmounts.map(q => (
                <Pressable
                  key={q}
                  onPress={() => setAmountText(String(q))}
                  style={({ pressed }) => [
                    styles.quickBtn,
                    pressed && styles.quickBtnPressed,
                  ]}>
                  <Text style={styles.quickBtnLabel}>{formatCurrency(q)}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {showReason ? (
            <>
              <Text style={styles.fieldLabel}>{reasonLabel}</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder={reasonPlaceholder}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.reasonInput]}
                multiline
              />
            </>
          ) : null}

          <View style={styles.actions}>
            <Button
              label="Cancelar"
              variant="secondary"
              onPress={onCancel}
              disabled={loading}
              style={styles.actionBtn}
            />
            <Button
              label={confirmLabel}
              variant={confirmVariant}
              onPress={handleConfirm}
              disabled={!canConfirm}
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
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  hintBlock: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  hintLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  hintValue: {
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
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  reasonInput: {
    minHeight: 80,
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'left',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
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
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
