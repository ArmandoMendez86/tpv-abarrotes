import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import type { UserRow } from '../database/models';
import {
  createUser,
  listVendors,
  setUserActive,
  setUserPassword,
  setUserPin,
} from '../database/usersRepo';
import { colors, radii, spacing, typography } from '../theme/theme';

type FormMode = 'pin' | 'password';

export function VendorsScreen() {
  const [vendors, setVendors] = useState<UserRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // --- Formulario Alta ----------------------------------------------------
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [mode, setMode] = useState<FormMode>('pin');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  // --- Edición rápida (Android-friendly: sin Alert.prompt) ---------------
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [editPin, setEditPin] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const refresh = useCallback(() => {
    setVendors(listVendors());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const activeCount = useMemo(
    () => vendors.filter(v => v.active === 1).length,
    [vendors],
  );

  const handleCreate = async () => {
    setErrorText(null);
    const u = username.trim();
    if (!u) {
      setErrorText('Captura el usuario (ej. juan).');
      return;
    }

    try {
      setSubmitting(true);
      const id = createUser({
        username: u,
        fullName: fullName.trim() || undefined,
        role: 'Vendedor',
        password: mode === 'password' ? password : '',
        pin: mode === 'pin' ? pin : undefined,
      });

      if (id < 0) {
        throw new Error('No se pudo crear el vendedor.');
      }

      setUsername('');
      setFullName('');
      setPin('');
      setPassword('');
      refresh();
      Alert.alert('Vendedor creado', 'Ya puede iniciar sesión.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado.';
      setErrorText(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = (v: UserRow) => {
    const nextActive = v.active !== 1;
    const action = nextActive ? 'reactivar' : 'dar de baja';
    Alert.alert(
      'Confirmar',
      `¿Deseas ${action} a ${displayName(v)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: nextActive ? 'Reactivar' : 'Dar de baja',
          style: nextActive ? 'default' : 'destructive',
          onPress: () => {
            setUserActive(v.id, nextActive);
            refresh();
          },
        },
      ],
    );
  };

  const handleSelect = (v: UserRow) => {
    setSelected(v);
    setEditPin('');
    setEditPassword('');
  };

  const handleSavePin = () => {
    if (!selected) {
      return;
    }
    try {
      setUserPin(selected.id, editPin.trim() || null);
      refresh();
      Alert.alert('Listo', 'PIN actualizado.');
      setEditPin('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado.';
      Alert.alert('No se pudo actualizar', msg);
    }
  };

  const handleSavePassword = () => {
    if (!selected) {
      return;
    }
    try {
      setUserPassword(selected.id, editPassword);
      refresh();
      Alert.alert('Listo', 'Contraseña actualizada.');
      setEditPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado.';
      Alert.alert('No se pudo actualizar', msg);
    }
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Cajeros</Text>
        <Text style={styles.subtitle}>
          {activeCount} activo{activeCount === 1 ? '' : 's'} ·{' '}
          {vendors.length} total
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Alta rápida</Text>
        <Text style={styles.cardHint}>
          Recomendación: usa PIN de 4 dígitos para que el cajero entre rápido.
          En Login, el PIN se captura en el campo de “Contraseña”.
        </Text>

        <TextField
          label="Usuario"
          value={username}
          onChangeText={setUsername}
          placeholder="ej. juan"
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon={<AppIcon name="account" />}
        />
        <TextField
          label="Nombre (opcional)"
          value={fullName}
          onChangeText={setFullName}
          placeholder="ej. Juan Pérez"
          leftIcon={<AppIcon name="card-account-details" />}
        />

        <View style={styles.segment}>
          <SegmentButton
            label="PIN (4 dígitos)"
            active={mode === 'pin'}
            onPress={() => setMode('pin')}
          />
          <SegmentButton
            label="Contraseña"
            active={mode === 'password'}
            onPress={() => setMode('password')}
          />
        </View>

        {mode === 'pin' ? (
          <TextField
            label="PIN"
            value={pin}
            onChangeText={t => setPin(t.replace(/[^\d]/g, '').slice(0, 4))}
            placeholder="1234"
            keyboardType="number-pad"
            leftIcon={<AppIcon name="dialpad" />}
          />
        ) : (
          <TextField
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="mínimo 1 caracter"
            secureTextEntry
            leftIcon={<AppIcon name="lock" />}
          />
        )}

        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

        <Button
          label="Crear vendedor"
          variant="primary"
          size="large"
          onPress={handleCreate}
          loading={submitting}
        />
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Vendedores registrados</Text>
        <Text style={styles.listHint}>Toca uno para acciones.</Text>
      </View>

      {selected ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Acciones · {displayName(selected)}</Text>
          <Text style={styles.cardHint}>Actualiza acceso sin borrar historial.</Text>

          <View style={styles.actionsRow}>
            <Button
              label={selected.active === 1 ? 'Dar de baja' : 'Reactivar'}
              variant={selected.active === 1 ? 'danger' : 'secondary'}
              onPress={() => handleToggleActive(selected)}
            />
            <Button
              label="Cerrar"
              variant="secondary"
              onPress={() => setSelected(null)}
            />
          </View>

          <TextField
            label="Nuevo PIN (4 dígitos)"
            value={editPin}
            onChangeText={t => setEditPin(t.replace(/[^\d]/g, '').slice(0, 4))}
            placeholder="1234"
            keyboardType="number-pad"
            leftIcon={<AppIcon name="dialpad" />}
          />
          <Button
            label="Guardar PIN"
            variant="success"
            onPress={handleSavePin}
          />

          <TextField
            label="Nueva contraseña"
            value={editPassword}
            onChangeText={setEditPassword}
            placeholder="mínimo 1 caracter"
            secureTextEntry
            leftIcon={<AppIcon name="lock-reset" />}
          />
          <Button
            label="Guardar contraseña"
            variant="primary"
            onPress={handleSavePassword}
          />
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        {vendors.map(v => (
          <Pressable
            key={v.id}
            onPress={() => handleSelect(v)}
            style={({ pressed }) => [
              styles.vendorRow,
              pressed && { opacity: 0.9 },
              v.active !== 1 && styles.vendorRowInactive,
            ]}
            accessibilityRole="button">
            <View style={styles.vendorIcon}>
              <AppIcon
                name={v.active === 1 ? 'account-check' : 'account-off'}
                size={24}
                color={v.active === 1 ? colors.success : colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vendorName} numberOfLines={1}>
                {displayName(v)}
              </Text>
              <Text style={styles.vendorMeta} numberOfLines={1}>
                Usuario: {v.username}
              </Text>
            </View>
            <View style={styles.badgeWrap}>
              <Text
                style={[
                  styles.badge,
                  v.active === 1 ? styles.badgeOn : styles.badgeOff,
                ]}>
                {v.active === 1 ? 'ACTIVO' : 'BAJA'}
              </Text>
            </View>
          </Pressable>
        ))}
        {vendors.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aún no hay vendedores</Text>
            <Text style={styles.emptyBody}>
              Crea uno arriba para que pueda iniciar turno.
            </Text>
          </View>
        ) : null}
      </View>
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

function displayName(v: UserRow): string {
  return v.full_name?.trim() ? v.full_name : v.username;
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  header: {
    gap: 2,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  cardHint: {
    ...typography.body,
    color: colors.textSecondary,
  },
  segment: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  segmentBtn: {
    flex: 1,
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
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  listHeader: {
    gap: 2,
    marginTop: spacing.sm,
  },
  listTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  listHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 76,
  },
  vendorIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorRowInactive: {
    backgroundColor: colors.surfaceMuted,
  },
  vendorName: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  vendorMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  badgeWrap: {
    alignItems: 'flex-end',
  },
  badge: {
    ...typography.caption,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    overflow: 'hidden',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  badgeOn: {
    color: colors.success,
    backgroundColor: '#ECFDF5',
  },
  badgeOff: {
    color: colors.danger,
    backgroundColor: '#FEF2F2',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

