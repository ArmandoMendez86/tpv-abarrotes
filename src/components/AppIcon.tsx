import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { colors } from '../theme/theme';

export type AppIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  name: AppIconName;
  size?: number;
  color?: string;
};

/**
 * Wrapper centralizado para iconografía.
 * Nos permite cambiar el set de íconos en 1 solo lugar si algún día lo necesitamos.
 */
export function AppIcon({ name, size = 22, color = colors.textSecondary }: Props) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

