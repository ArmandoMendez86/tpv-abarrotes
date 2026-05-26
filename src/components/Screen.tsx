import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  keyboardOffset?: number;
};

/**
 * Contenedor base de cualquier pantalla. Encapsula:
 *  - Safe area top/bottom para tablets y teléfonos Android.
 *  - KeyboardAvoidingView (importante en pantallas con TextInput, sino el
 *    teclado oculta el botón de "Iniciar sesión" o "Cobrar" en Android).
 *  - ScrollView opcional para contenidos largos (formularios de admin, etc.).
 */
export function Screen({
  children,
  scroll = false,
  contentStyle,
  keyboardOffset = 0,
}: Props) {
  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { contentContainerStyle: [styles.content, contentStyle] }
    : { style: [styles.content, contentStyle] };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardOffset}>
        <Body keyboardShouldPersistTaps="handled" {...bodyProps}>
          {children}
        </Body>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
  },
});
