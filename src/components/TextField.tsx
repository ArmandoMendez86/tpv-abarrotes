import { ReactNode, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, radii, sizes, spacing, typography } from '../theme/theme';

type Props = TextInputProps & {
  label: string;
  errorText?: string | null;
  leftIcon?: ReactNode;
};

/**
 * Input táctil estandarizado. Altura generosa, label claro arriba y un
 * estado visible cuando hay error de validación. Se mantiene controlado
 * desde fuera (se le pasa value/onChangeText) para que la pantalla
 * decida cuándo limpiar o resetear.
 */
export function TextField({ label, errorText, leftIcon, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const hasError = !!errorText;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          {
            borderColor: hasError
              ? colors.danger
              : focused
              ? colors.focusRing
              : colors.border,
          },
        ]}>
        {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          {...rest}
          onFocus={e => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, leftIcon ? styles.inputWithIcon : null, style]}
        />
      </View>
      {hasError ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputWrap: {
    minHeight: sizes.inputHeight,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.lg,
  },
  iconSlot: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: sizes.inputHeight - 2,
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
    fontSize: 18,
  },
  inputWithIcon: {
    paddingLeft: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
