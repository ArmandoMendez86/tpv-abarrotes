import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { colors, radii, sizes, typography } from '../theme/theme';

type Variant = 'primary' | 'success' | 'secondary' | 'danger';
type Size = 'large' | 'medium';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  style?: ViewStyle;
};

/**
 * Botón táctil de uso general en el POS. Pensado para dedos rápidos:
 * altura grande, esquinas suaves, contraste alto y respuesta visual inmediata
 * al presionar (state 'pressed').
 *
 * Variantes:
 *  - primary  : acciones principales no destructivas (Iniciar sesión, Guardar).
 *  - success  : "Cobrar" / Confirmar venta. Verde para indicar dinero/ok.
 *  - secondary: acciones complementarias (Cancelar, Volver).
 *  - danger   : acciones destructivas (Eliminar, Cerrar sesión).
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  const palette = VARIANTS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? palette.bgPressed : palette.bg,
          borderColor: palette.border,
          height: size === 'large' ? sizes.buttonLarge : sizes.buttonMedium,
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.label, { color: palette.fg }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<
  Variant,
  { bg: string; bgPressed: string; fg: string; border: string }
> = {
  primary: {
    bg: colors.primary,
    bgPressed: colors.primaryPressed,
    fg: colors.textOnPrimary,
    border: 'transparent',
  },
  success: {
    bg: colors.success,
    bgPressed: colors.successPressed,
    fg: colors.textOnPrimary,
    border: 'transparent',
  },
  secondary: {
    bg: colors.surface,
    bgPressed: colors.surfaceMuted,
    fg: colors.textPrimary,
    border: colors.border,
  },
  danger: {
    bg: colors.danger,
    bgPressed: colors.dangerPressed,
    fg: colors.textOnPrimary,
    border: 'transparent',
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  label: {
    ...typography.button,
    textAlign: 'center',
  },
});
