import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import {
  getTicketSettings,
  saveTicketSettings,
  type PrinterMode,
} from '../database/settingsRepo';
import { buildTestTicketText } from '../printing/ticketPreview';
import type { AdminStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<AdminStackParamList, 'TicketSettings'>;

type Form = {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  farewellMessage: string;
  printerMode: PrinterMode;
  // Bluetooth (solo guardamos; la selección real se implementa después)
  btDeviceName: string;
  btDeviceId: string;
  // Network
  netHost: string;
  netPort: string;
};

export function TicketSettingsScreen(_props: Props) {
  const [form, setForm] = useState<Form>(() => toForm(getTicketSettings()));
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(() => {
    setForm(toForm(getTicketSettings()));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const canSave = useMemo(() => {
    if (form.printerMode === 'network') {
      if (!form.netHost.trim()) {
        return false;
      }
      const p = parsePort(form.netPort);
      if (p == null) {
        return false;
      }
    }
    return true;
  }, [form.netHost, form.netPort, form.printerMode]);

  const handleSave = async () => {
    if (!canSave) {
      Alert.alert('Revisa la impresora', 'Captura IP/host y puerto válidos.');
      return;
    }
    setSubmitting(true);
    try {
      saveTicketSettings({
        storeName: form.storeName,
        storeAddress: form.storeAddress,
        storePhone: form.storePhone,
        farewellMessage: form.farewellMessage,
        printerMode: form.printerMode,
        btDeviceName: form.btDeviceName.trim() || null,
        btDeviceId: form.btDeviceId.trim() || null,
        netHost: form.netHost.trim() || null,
        netPort: parsePort(form.netPort),
      });
      Alert.alert('Guardado', 'Configuración actualizada.');
      refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado.';
      Alert.alert('No se pudo guardar', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTest = () => {
    const current = getTicketSettings();
    const preview = buildTestTicketText(current);

    if (current.printerMode === 'network') {
      Alert.alert(
        'Ticket de prueba (vista previa)',
        `${preview}\n\nImpresora en red: ${current.netHost ?? '—'}:${current.netPort ?? '—'}\n\nNota: la impresión real por red/Bluetooth se activa en la siguiente fase (requiere módulo nativo).`,
      );
      return;
    }
    if (current.printerMode === 'bluetooth') {
      Alert.alert(
        'Ticket de prueba (vista previa)',
        `${preview}\n\nImpresora Bluetooth: ${current.btDeviceName ?? '—'}\n\nNota: la impresión real por Bluetooth se activa en la siguiente fase (requiere permisos y módulo nativo).`,
      );
      return;
    }
    Alert.alert('Ticket de prueba (vista previa)', preview);
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos del ticket</Text>
        <Text style={styles.sectionHint}>
          Estos datos se usarán en el ticket impreso (Bluetooth o red) cuando
          activemos impresión.
        </Text>

        <TextField
          label="Nombre del negocio"
          value={form.storeName}
          onChangeText={t => setForm(prev => ({ ...prev, storeName: t }))}
          placeholder="Ej. Abarrotes Lupita"
          leftIcon={<AppIcon name="storefront-outline" />}
        />
        <TextField
          label="Dirección"
          value={form.storeAddress}
          onChangeText={t => setForm(prev => ({ ...prev, storeAddress: t }))}
          placeholder="Calle, número, colonia"
          leftIcon={<AppIcon name="map-marker-outline" />}
        />
        <TextField
          label="Teléfono"
          value={form.storePhone}
          onChangeText={t => setForm(prev => ({ ...prev, storePhone: t }))}
          placeholder="Ej. 55 1234 5678"
          keyboardType="phone-pad"
          leftIcon={<AppIcon name="phone-outline" />}
        />
        <TextField
          label="Mensaje de despedida"
          value={form.farewellMessage}
          onChangeText={t => setForm(prev => ({ ...prev, farewellMessage: t }))}
          placeholder="Gracias por su compra"
          leftIcon={<AppIcon name="message-text-outline" />}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Impresora (preparado)</Text>
        <Text style={styles.sectionHint}>
          Puedes dejar guardada la configuración. La conexión/impresión se
          implementa en una fase posterior.
        </Text>

        <View style={styles.segment}>
          <SegmentButton
            label="Sin impresora"
            active={form.printerMode === 'none'}
            onPress={() => setForm(prev => ({ ...prev, printerMode: 'none' }))}
          />
          <SegmentButton
            label="Bluetooth"
            active={form.printerMode === 'bluetooth'}
            onPress={() =>
              setForm(prev => ({ ...prev, printerMode: 'bluetooth' }))
            }
          />
          <SegmentButton
            label="Red (IP)"
            active={form.printerMode === 'network'}
            onPress={() =>
              setForm(prev => ({ ...prev, printerMode: 'network' }))
            }
          />
        </View>

        {form.printerMode === 'bluetooth' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bluetooth</Text>
            <Text style={styles.cardHint}>
              En el futuro aquí mostraremos un botón para buscar/seleccionar la
              impresora. Por ahora puedes guardar el nombre/ID manualmente.
            </Text>
            <TextField
              label="Nombre del dispositivo (opcional)"
              value={form.btDeviceName}
              onChangeText={t => setForm(prev => ({ ...prev, btDeviceName: t }))}
              placeholder="Ej. Printer-58"
              leftIcon={<AppIcon name="bluetooth" />}
            />
            <TextField
              label="ID / MAC (opcional)"
              value={form.btDeviceId}
              onChangeText={t => setForm(prev => ({ ...prev, btDeviceId: t }))}
              placeholder="Ej. AA:BB:CC:DD:EE:FF"
              autoCapitalize="characters"
              leftIcon={<AppIcon name="identifier" />}
            />
          </View>
        ) : null}

        {form.printerMode === 'network' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Impresora en red</Text>
            <Text style={styles.cardHint}>
              La mayoría de térmicas ESC/POS usan puerto 9100.
            </Text>
            <TextField
              label="IP o host"
              value={form.netHost}
              onChangeText={t => setForm(prev => ({ ...prev, netHost: t }))}
              placeholder="Ej. 192.168.1.50"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<AppIcon name="wifi" />}
            />
            <TextField
              label="Puerto"
              value={form.netPort}
              onChangeText={t =>
                setForm(prev => ({ ...prev, netPort: digitsOnly(t).slice(0, 5) }))
              }
              placeholder="9100"
              keyboardType="number-pad"
              leftIcon={<AppIcon name="numeric" />}
            />
          </View>
        ) : null}
      </View>

      <Button
        label="Guardar configuración"
        variant="primary"
        size="large"
        onPress={handleSave}
        loading={submitting}
        disabled={!canSave}
      />

      <Button
        label="Ver ticket de prueba"
        variant="secondary"
        size="medium"
        onPress={handleTest}
      />
    </Screen>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentBtn,
        active && styles.segmentBtnActive,
        pressed && { opacity: 0.9 },
      ]}
      accessibilityRole="button">
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function toForm(s: ReturnType<typeof getTicketSettings>): Form {
  return {
    storeName: s.storeName,
    storeAddress: s.storeAddress,
    storePhone: s.storePhone,
    farewellMessage: s.farewellMessage,
    printerMode: s.printerMode,
    btDeviceName: s.btDeviceName ?? '',
    btDeviceId: s.btDeviceId ?? '',
    netHost: s.netHost ?? '',
    netPort: s.netPort != null ? String(s.netPort) : '9100',
  };
}

function digitsOnly(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function parsePort(value: string): number | null {
  const raw = digitsOnly(value);
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 65535) {
    return null;
  }
  return n;
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  sectionHint: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  },
  segment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  segmentBtn: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  segmentBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  segmentLabel: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  segmentLabelActive: {
    color: colors.textPrimary,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  cardHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

