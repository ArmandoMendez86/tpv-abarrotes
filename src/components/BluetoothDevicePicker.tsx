import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppIcon } from './AppIcon';
import {
  checkBluetoothEnabled,
  enableBluetooth,
  requestBluetoothPermissions,
  scanDevices,
  type BtDevice,
} from '../printing/bluetoothPrinter';
import { colors, radii, spacing, typography } from '../theme/theme';

type Props = {
  visible: boolean;
  currentAddress: string | null;
  onSelect: (device: BtDevice) => void;
  onDismiss: () => void;
};

export function BluetoothDevicePicker({
  visible,
  currentAddress,
  onSelect,
  onDismiss,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [paired, setPaired] = useState<BtDevice[]>([]);
  const [found, setFound] = useState<BtDevice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const doScan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPaired([]);
    setFound([]);
    try {
      const granted = await requestBluetoothPermissions();
      if (!granted) {
        setError(
          'Se necesitan permisos de Bluetooth.\nVe a Ajustes del dispositivo y actívalos para esta app.',
        );
        return;
      }
      const enabled = await checkBluetoothEnabled();
      if (!enabled) {
        try {
          await enableBluetooth();
        } catch {
          setError('Activa el Bluetooth del dispositivo e intenta de nuevo.');
          return;
        }
      }
      const result = await scanDevices();
      setPaired(result.paired);
      setFound(result.found);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al buscar dispositivos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      doScan();
    } else {
      setPaired([]);
      setFound([]);
      setError(null);
    }
  }, [visible, doScan]);

  const handleSelect = (device: BtDevice) => {
    onSelect(device);
    onDismiss();
  };

  // Merge: paired primero, luego found que no estén ya en paired
  const allDevices: BtDevice[] = [
    ...paired,
    ...found.filter(f => !paired.some(p => p.address === f.address)),
  ];

  const renderDevice = ({ item }: { item: BtDevice }) => {
    const selected = item.address === currentAddress;
    return (
      <Pressable
        onPress={() => handleSelect(item)}
        style={({ pressed }) => [
          styles.row,
          selected && styles.rowSelected,
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button">
        <AppIcon
          name="printer-wireless"
          size={24}
          color={selected ? colors.primary : colors.textSecondary}
        />
        <View style={styles.rowText}>
          <Text
            style={[styles.deviceName, selected && { color: colors.primary }]}
            numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.deviceAddress}>{item.address}</Text>
        </View>
        {selected && (
          <AppIcon name="check-circle" size={20} color={colors.success} />
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss} />
      <View style={styles.sheet}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.title}>Seleccionar impresora</Text>
          <Pressable onPress={onDismiss} hitSlop={12} accessibilityRole="button">
            <AppIcon name="close" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Contenido */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.hint}>Buscando dispositivos Bluetooth…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <AppIcon name="bluetooth-off" size={40} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={doScan} style={styles.retryBtn}>
              <AppIcon name="refresh" size={18} color={colors.primary} />
              <Text style={styles.retryLabel}>Reintentar</Text>
            </Pressable>
          </View>
        ) : allDevices.length === 0 ? (
          <View style={styles.center}>
            <AppIcon name="bluetooth-off" size={40} color={colors.textSecondary} />
            <Text style={styles.hint}>
              No se encontraron dispositivos.{'\n'}
              Asegúrate de que la impresora esté encendida y en modo visible.
            </Text>
            <Pressable onPress={doScan} style={styles.retryBtn}>
              <AppIcon name="refresh" size={18} color={colors.primary} />
              <Text style={styles.retryLabel}>Buscar de nuevo</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={allDevices}
            keyExtractor={item => item.address}
            renderItem={renderDevice}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <Text style={styles.sectionLabel}>
                {paired.length > 0 ? `${paired.length} emparejado${paired.length !== 1 ? 's' : ''}` : ''}
                {found.length > 0
                  ? `${paired.length > 0 ? ' · ' : ''}${found.length} cercano${found.length !== 1 ? 's' : ''}`
                  : ''}
              </Text>
            }
          />
        )}

        {/* Botón refrescar (siempre visible cuando no está cargando) */}
        {!loading && (
          <Pressable
            onPress={doScan}
            style={({ pressed }) => [
              styles.refreshBtn,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button">
            <AppIcon name="refresh" size={18} color={colors.primary} />
            <Text style={styles.refreshLabel}>Actualizar lista</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '70%',
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.lg,
  },
  hint: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryLabel: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: spacing.xs,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  rowText: {
    flex: 1,
  },
  deviceName: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  deviceAddress: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshLabel: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
});
