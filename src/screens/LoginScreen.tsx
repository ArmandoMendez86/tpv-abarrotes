import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '../assets/images';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { colors, radii, spacing, typography } from '../theme/theme';

/**
 * Pantalla de inicio de sesión rediseñada con identidad de tienda de
 * abarrotes:
 *  - Header cálido (crema → dorado) con marca grande y, opcionalmente, una
 *    imagen hero (logo o ilustración) cargada desde src/assets/images.
 *  - Si todavía no se proporciona imagen, mostramos una "ilustración" de
 *    respaldo hecha con emojis sobre un círculo, para que la pantalla
 *    nunca se vea vacía.
 *  - Tarjeta inferior elevada (forma redondeada arriba) con los campos de
 *    usuario / contraseña y botón gigante "Entrar".
 */
export function LoginScreen() {
  const { signIn } = useAuth();
  const { height } = useWindowDimensions();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Heurística "foolproof": si el cajero está capturando un PIN (solo dígitos,
  // hasta 4), mostramos el texto y usamos teclado numérico. Si escribe una
  // contraseña normal, se oculta como siempre.
  const looksLikePin =
    password.length > 0 && /^\d{1,4}$/.test(password.trim());

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      setErrorText('Captura usuario y contraseña.');
      return;
    }
    setErrorText(null);
    setSubmitting(true);
    try {
      const user = await signIn(username, password);
      if (!user) {
        setErrorText('Usuario o contraseña incorrectos.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado.';
      Alert.alert('No se pudo iniciar sesión', msg);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // En pantallas pequeñas reducimos el alto del header para que el formulario
  // no quede tapado por el teclado al hacer foco en los inputs.
  // El hero llena la mayor parte del header (~75% de su alto) para que sea
  // el protagonista visual. Va recortado en círculo (medallón abarrotero).
  const headerHeight = keyboardVisible
    ? Math.max(200, Math.min(280, height * 0.28))
    : Math.max(360, Math.min(500, height * 0.5));
  const heroSize = Math.round(headerHeight * 0.75);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brandRedDeep} />
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={[styles.header, { height: headerHeight }]}>
          <View style={styles.headerDecorationTop} />
          <View style={styles.headerDecorationBottom} />

          <View
            style={[
              styles.heroWrap,
              {
                width: heroSize,
                height: heroSize,
                borderRadius: heroSize / 2,
              },
            ]}>
            {images.loginHero ? (
              <Image
                source={images.loginHero}
                style={styles.heroImage}
                resizeMode="cover"
                accessibilityLabel="Marca del negocio"
              />
            ) : (
              <Text
                style={[
                  styles.heroFallbackEmoji,
                  { fontSize: heroSize * 0.5 },
                ]}>
                🛒
              </Text>
            )}
          </View>

          <Text style={styles.brandTitle}>TPV</Text>
          <Text style={styles.brandTagline}>Tu abarrotería, en orden.</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.cardScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.flex}>
            <View style={styles.card}>
              <View style={styles.cardHandle} />

              <Text style={styles.cardTitle}>Iniciar sesión</Text>
              <Text style={styles.cardSubtitle}>
                Ingresa con tu usuario asignado. Los cajeros pueden usar su PIN de 4 dígitos.
              </Text>

              <TextField
                label="Usuario"
                value={username}
                onChangeText={setUsername}
                placeholder="ej. cajero"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
              />
              <TextField
                label="Contraseña o PIN"
                value={password}
                onChangeText={setPassword}
                placeholder={looksLikePin ? '1234' : '••••••••'}
                secureTextEntry={!looksLikePin}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                keyboardType={looksLikePin ? 'number-pad' : 'default'}
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                errorText={errorText}
              />

              <Button
                label="Entrar"
                onPress={handleSubmit}
                loading={submitting}
                variant="primary"
                size="large"
                style={styles.submit}
              />

              <View style={styles.demoBox}>
                <Text style={styles.demoTitle}>Cuentas de prueba</Text>
                <Text style={styles.demoLine}>
                  Administrador · admin / admin123
                </Text>
                <Text style={styles.demoLine}>
                  Vendedor · cajero / cajero123
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brandRedDeep,
  },
  flex: { flex: 1 },
  safeTop: {
    backgroundColor: colors.brandRedDeep,
  },
  header: {
    backgroundColor: colors.brandRed,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  /** Círculos decorativos detrás de la marca para dar textura. */
  headerDecorationTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.brandGold,
    opacity: 0.18,
  },
  headerDecorationBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.brandRedDeep,
    opacity: 0.55,
  },
  /**
   * Marco circular del logo. overflow:'hidden' recorta la imagen al círculo
   * (necesario en Android, sino las esquinas asoman). Borde dorado y sombra
   * para que el medallón resalte sobre el rojo del header.
   */
  heroWrap: {
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandCream,
    borderWidth: 5,
    borderColor: colors.brandGold,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallbackEmoji: {
    color: colors.brandRedDeep,
  },
  brandTitle: {
    color: colors.brandCream,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 6,
  },
  brandTagline: {
    color: colors.brandCream,
    opacity: 0.92,
    ...typography.body,
    marginTop: 2,
  },
  cardScroll: {
    flexGrow: 1,
    paddingTop: 0,
  },
  card: {
    backgroundColor: colors.surface,
    flex: 1,
    marginTop: -spacing.xl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  /** Pequeña barra estilo "bottom sheet" para sugerir que la tarjeta sube. */
  cardHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  cardSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  submit: {
    marginTop: spacing.sm,
  },
  demoBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.brandCream,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brandGold,
    gap: 2,
  },
  demoTitle: {
    ...typography.caption,
    color: colors.brandRedDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  demoLine: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
