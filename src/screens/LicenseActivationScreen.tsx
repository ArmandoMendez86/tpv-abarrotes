import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { colors, radii, spacing, typography } from '../theme/theme';

/**
 * Pantalla de activación de licencia. Se muestra la primera vez que el
 * cliente instala la app, antes de llegar al login.
 *
 * Flujo:
 *  1. El cliente ingresa su clave ECOM-XXXX que recibió al comprar.
 *  2. La app la valida contra el servidor ecommer.
 *  3. Si es válida, la clave se guarda localmente y la app vincula este
 *     dispositivo como el autorizado (device_fingerprint en el servidor).
 *  4. RootNavigator detecta que licenseKey ya no es null y monta el Login.
 */
export function LicenseActivationScreen() {
  const { activateLicense } = useAuth();
  const [licenseInput, setLicenseInput] = useState('');
  const [activating, setActivating]     = useState(false);
  const [errorText, setErrorText]       = useState<string | null>(null);

  const handleActivate = async () => {
    const key = licenseInput.trim().toUpperCase();
    if (!key) {
      setErrorText('Ingresa tu clave de licencia.');
      return;
    }
    setErrorText(null);
    setActivating(true);
    try {
      await activateLicense(key);
      // RootNavigator monta automáticamente el AuthStack cuando licenseKey cambia.
    } catch (err: unknown) {
      setErrorText(
        err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.',
      );
    } finally {
      setActivating(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brandRedDeep} />

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        {/* ── Header con marca ── */}
        <View style={styles.header}>
          <View style={styles.decorCircleTopRight} />
          <View style={styles.decorCircleBottomLeft} />

          <View style={styles.iconBadge}>
            <Text style={styles.iconEmoji}>🔑</Text>
          </View>
          <Text style={styles.headerTitle}>Activar Programa</Text>
          <Text style={styles.headerSubtitle}>
            Ingresa la clave de licencia que recibiste al comprar
          </Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.flex}>

            {/* ── Tarjeta de formulario ── */}
            <View style={styles.card}>
              <View style={styles.cardHandle} />

              <Text style={styles.cardTitle}>Clave de activación</Text>
              <Text style={styles.cardSubtitle}>
                Tu clave tiene el formato{' '}
                <Text style={styles.monoSample}>ECOM-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX</Text>
                {' '}y quedará vinculada a este dispositivo.
              </Text>

              <TextField
                label="Clave de licencia"
                value={licenseInput}
                onChangeText={v => {
                  setLicenseInput(v);
                  if (errorText) setErrorText(null);
                }}
                placeholder="ECOM-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                returnKeyType="go"
                onSubmitEditing={handleActivate}
                errorText={errorText}
              />

              <Button
                label={activating ? 'Verificando...' : 'Activar programa'}
                onPress={handleActivate}
                loading={activating}
                variant="primary"
                size="large"
                style={styles.activateBtn}
              />

              {/* ── Instrucciones de ayuda ── */}
              <View style={styles.helpBox}>
                <Text style={styles.helpTitle}>¿Cómo obtener tu clave?</Text>
                <HelpStep n={1} text="Ingresa a la tienda donde compraste el programa." />
                <HelpStep n={2} text="Ve a Mis pedidos y selecciona tu compra." />
                <HelpStep n={3} text="Copia la clave de licencia del detalle del pedido." />
                <HelpStep n={4} text="Pégala aquí y presiona Activar programa." />
              </View>

              {/* ── Nota de vinculación ── */}
              <View style={styles.noteBox}>
                <Text style={styles.noteText}>
                  ⚠️  La licencia solo puede estar activa en{' '}
                  <Text style={styles.noteBold}>un dispositivo a la vez</Text>.
                  Si necesitas cambiar de dispositivo, contacta al proveedor.
                </Text>
              </View>
            </View>

          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function HelpStep({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.helpStep}>
      <View style={styles.helpStepBullet}>
        <Text style={styles.helpStepNumber}>{n}</Text>
      </View>
      <Text style={styles.helpStepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.brandRedDeep },
  flex:    { flex: 1 },
  safeTop: { backgroundColor: colors.brandRedDeep },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    backgroundColor: colors.brandRed,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl + spacing.xl,  // espacio extra para el card que sube encima
    alignItems: 'center',
    overflow: 'hidden',
  },
  decorCircleTopRight: {
    position: 'absolute',
    top: -70,
    right: -55,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.brandGold,
    opacity: 0.15,
  },
  decorCircleBottomLeft: {
    position: 'absolute',
    bottom: -90,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.brandRedDeep,
    opacity: 0.5,
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brandCream,
    borderWidth: 4,
    borderColor: colors.brandGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  iconEmoji:       { fontSize: 36 },
  headerTitle:     {
    color: colors.brandCream,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSubtitle:  {
    color: colors.brandCream,
    opacity: 0.9,
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  scrollContent: { flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    flex: 1,
    marginTop: -spacing.xxl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  cardHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardTitle:    { ...typography.title, color: colors.textPrimary },
  cardSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  monoSample: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  activateBtn: { marginTop: spacing.sm },

  // ── Caja de ayuda ────────────────────────────────────────────────────────
  helpBox: {
    padding: spacing.lg,
    backgroundColor: colors.brandCream,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brandGold,
    gap: spacing.sm,
  },
  helpTitle: {
    ...typography.caption,
    color: colors.brandRedDeep,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  helpStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  helpStepBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brandRedDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  helpStepNumber: {
    color: colors.brandCream,
    fontSize: 11,
    fontWeight: '700',
  },
  helpStepText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  // ── Nota de advertencia ──────────────────────────────────────────────────
  noteBox: {
    padding: spacing.md,
    backgroundColor: '#FFF9E6',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#F5B700',
  },
  noteText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  noteBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
