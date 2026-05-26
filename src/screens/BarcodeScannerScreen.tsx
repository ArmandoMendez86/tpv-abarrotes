import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Camera, CameraType } from 'react-native-camera-kit';
import { Button } from '../components/Button';
import type { AdminStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<AdminStackParamList, 'BarcodeScanner'>;

/**
 * Pantalla de escaneo para capturar código de barras rápidamente.
 * Regresa a ProductForm con `scannedBarcode`.
 */
export function BarcodeScannerScreen({ navigation, route }: Props) {
  const lockedRef = useRef(false);
  const [permission, setPermission] = useState<
    'unknown' | 'checking' | 'granted' | 'denied'
  >('checking');
  const [cameraKey, setCameraKey] = useState(0);
  const [lastRead, setLastRead] = useState<{ value: string; format?: string } | null>(
    null,
  );
  const [lastError, setLastError] = useState<string | null>(null);

  // Nota: CameraKit recomienda gestionar permisos con una lib externa.
  // Para no meter otra dependencia, usamos PermissionsAndroid en Android.
  // (En iOS se resuelve con Info.plist cuando tengas carpeta ios).
  useEffect(() => {
    if (Platform.OS !== 'android') {
      setPermission('unknown');
      return;
    }
    (async () => {
      try {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        const ok = res === PermissionsAndroid.RESULTS.GRANTED;
        setPermission(ok ? 'granted' : 'denied');
        // Importante: montamos la cámara DESPUÉS del permiso para que arranque el analyzer.
        if (ok) {
          setCameraKey(prev => prev + 1);
        }
      } catch {
        setPermission('unknown');
      }
    })();
  }, []);

  const handleRead = useCallback(
    (event: { nativeEvent?: { codeStringValue?: string; codeFormat?: string } }) => {
      const value = event?.nativeEvent?.codeStringValue?.trim();
      const fmt = event?.nativeEvent?.codeFormat;
      if (value) {
        setLastRead({ value, format: fmt });
      }
      if (!value) {
        return;
      }
      if (lockedRef.current) {
        return;
      }
      lockedRef.current = true;

      if (route.params.returnTo === 'ProductForm') {
        // Actualiza la pantalla ProductForm exacta (por su key) para no crear otra instancia.
        navigation.dispatch({
          ...CommonActions.setParams({ scannedBarcode: value }),
          source: route.params.returnToKey,
        });
      }
      // Dejamos que la navegación anterior procese el dispatch antes de cerrar.
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 0);
    },
    [navigation, route.params.returnTo, route.params.returnToKey],
  );

  const handleError = useCallback(
    (event?: { nativeEvent?: { errorMessage?: string } }) => {
      const msg = event?.nativeEvent?.errorMessage ?? 'No se pudo abrir la cámara.';
      setLastError(msg);
      Alert.alert(
        'Cámara no disponible',
        `${msg}\n\nRevisa permisos de cámara en Ajustes.`,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => navigation.goBack() },
          { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
        ],
      );
    },
    [navigation],
  );

  const debugLine = useMemo(() => {
    const p =
      permission === 'checking'
        ? 'permiso: …'
        : permission === 'unknown'
        ? 'permiso: ?'
        : permission === 'granted'
          ? 'permiso: OK'
          : 'permiso: DENEGADO';
    const r = lastRead ? `último: ${lastRead.value}${lastRead.format ? ` (${lastRead.format})` : ''}` : 'último: —';
    const e = lastError ? `error: ${lastError}` : '';
    return [p, r, e].filter(Boolean).join(' · ');
  }, [lastError, lastRead, permission]);

  return (
    <View style={styles.root}>
      {permission === 'granted' ? (
        <Suspense fallback={<View style={StyleSheet.absoluteFill} />}>
          <Camera
            // Forzamos remount cuando cambia el permiso.
            key={`camera-${cameraKey}`}
            style={StyleSheet.absoluteFill}
            scanBarcode
            // showFrame filtra por “dentro del cuadro”; en muchos códigos de barras
            // puede ser demasiado estricto. Preferimos leer en toda la imagen.
            showFrame={false}
            focusMode="on"
            scanThrottleDelay={600}
            allowedBarcodeTypes={[
              'ean-13',
              'ean-8',
              'upc-a',
              'upc-e',
              'code-128',
              'code-39',
              'code-93',
              'itf',
              'codabar',
              'pdf-417',
              'qr',
              'aztec',
              'data-matrix',
            ]}
            onReadCode={handleRead}
            onError={handleError}
            cameraType={CameraType.Back}
          />
        </Suspense>
      ) : null}

      <View style={styles.overlay}>
        <View style={styles.topCard}>
          <Text style={styles.title}>Escanear código</Text>
          <Text style={styles.hint}>Alinea el código dentro del recuadro.</Text>
          <Text style={styles.debug} numberOfLines={2}>
            {debugLine}
          </Text>
        </View>

        <View style={styles.bottom}>
          {permission === 'denied' ? (
            <Button
              label="Abrir ajustes"
              variant="secondary"
              onPress={() => Linking.openSettings()}
            />
          ) : null}
          <Button label="Cancelar" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  topCard: {
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: 4,
  },
  title: {
    ...typography.subtitle,
    color: colors.textOnPrimary,
    fontWeight: '900',
  },
  hint: {
    ...typography.body,
    color: 'rgba(255,255,255,0.9)',
  },
  debug: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
    marginTop: spacing.sm,
  },
  bottom: {
    gap: spacing.md,
  },
});

