import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/theme';

type Props = {
  title: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  onPress: () => void;
  variant?: 'default' | 'highlight';
  style?: ViewStyle;
};

/**
 * Tile grande para accesos del Administrador.
 * Pensado para tablets: icono claro, texto grande y zona táctil generosa.
 */
export function AdminActionTile({
  title,
  value,
  hint,
  icon,
  onPress,
  variant = 'default',
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        variant === 'highlight' ? styles.highlight : styles.default,
        pressed && styles.pressed,
        style,
      ]}>
      <View style={styles.icon}>{icon}</View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
        {hint ? (
          <Text style={styles.hint} numberOfLines={2}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    minHeight: 96,
  },
  default: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  highlight: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '800',
  },
  value: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 24,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 30,
    lineHeight: 30,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
});

