import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { AppIcon } from '../components/AppIcon';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import {
  createProduct,
  getProductById,
  setProductActive,
  updateProduct,
} from '../database/productsRepo';
import type { AdminStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<AdminStackParamList, 'ProductForm'>;

interface FormState {
  name: string;
  barcode: string;
  category: string;
  cost: string;
  price: string;
  stock: string;
  stockMin: string;
  active: boolean;
}

const EMPTY: FormState = {
  name: '',
  barcode: '',
  category: '',
  cost: '',
  price: '',
  stock: '0',
  stockMin: '10',
  active: true,
};

interface FormErrors {
  name?: string;
  cost?: string;
  price?: string;
  stock?: string;
  stockMin?: string;
}

/**
 * Formulario de producto. Misma pantalla para "crear" y "editar":
 *  - Si la ruta llega sin productId, crea uno nuevo.
 *  - Si llega con productId, carga el registro y permite modificar / desactivar.
 *
 * Validaciones mínimas:
 *  - 'name' obligatorio.
 *  - cost / price / stock numéricos no negativos.
 *  - El UNIQUE de barcode lo refuerza la BD; aquí atrapamos el error y avisamos.
 */
export function ProductFormScreen({ route, navigation }: Props) {
  const productId = route.params?.productId;
  const isEditing = typeof productId === 'number';
  const scannedBarcode = route.params?.scannedBarcode;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setForm(EMPTY);
      return;
    }
    const row = getProductById(productId);
    if (!row) {
      Alert.alert('Producto no encontrado', 'Es posible que se haya eliminado.', [
        { text: 'Volver', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    setForm({
      name: row.name,
      barcode: row.barcode ?? '',
      category: row.category ?? '',
      cost: String(row.cost),
      price: String(row.price),
      stock: String(row.stock),
      stockMin: String(row.stock_min ?? 10),
      active: row.active === 1,
    });
  }, [isEditing, productId, navigation]);

  useEffect(() => {
    if (!scannedBarcode) {
      return;
    }
    setForm(prev => ({ ...prev, barcode: scannedBarcode }));
    // Evita que se vuelva a aplicar si el usuario regresa a esta pantalla.
    navigation.setParams({ scannedBarcode: undefined });
  }, [navigation, scannedBarcode]);

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.name.trim()) {
      next.name = 'El nombre es obligatorio.';
    }
    const cost = parseNumber(form.cost);
    if (cost == null || cost < 0) {
      next.cost = 'Captura un costo válido (0 o mayor).';
    }
    const price = parseNumber(form.price);
    if (price == null || price < 0) {
      next.price = 'Captura un precio válido (0 o mayor).';
    }
    const stock = parseInteger(form.stock);
    if (stock == null) {
      next.stock = 'El stock debe ser un número entero.';
    } else if (stock < 0) {
      next.stock = 'El stock no puede ser negativo.';
    }
    const stockMin = parseInteger(form.stockMin);
    if (stockMin == null) {
      next.stockMin = 'El stock mínimo debe ser un número entero.';
    } else if (stockMin < 0) {
      next.stockMin = 'El stock mínimo no puede ser negativo.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        barcode: form.barcode.trim() || null,
        category: form.category.trim() || null,
        cost: parseNumber(form.cost) ?? 0,
        price: parseNumber(form.price) ?? 0,
        stock: parseInteger(form.stock) ?? 0,
        stockMin: parseInteger(form.stockMin) ?? 10,
      };
      if (isEditing) {
        updateProduct(productId, payload);
        if (!form.active) {
          setProductActive(productId, false);
        } else {
          setProductActive(productId, true);
        }
      } else {
        createProduct(payload);
      }
      navigation.goBack();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      const friendly = raw.includes('UNIQUE') && raw.includes('barcode')
        ? 'Ya existe otro producto con ese código de barras.'
        : raw || 'No se pudo guardar el producto.';
      Alert.alert('Revisa los datos', friendly);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!isEditing) {
      return;
    }
    Alert.alert(
      'Desactivar producto',
      `"${form.name}" dejará de aparecer en la caja. Podrás reactivarlo después desde el listado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: () => {
            if (!validate()) {
              return;
            }
            try {
              const payload = {
                name: form.name.trim(),
                barcode: form.barcode.trim() || null,
                category: form.category.trim() || null,
                cost: parseNumber(form.cost) ?? 0,
                price: parseNumber(form.price) ?? 0,
                stock: parseInteger(form.stock) ?? 0,
                stockMin: parseInteger(form.stockMin) ?? 10,
              };
              updateProduct(productId, payload);
              setProductActive(productId, false);
              navigation.goBack();
            } catch (err: unknown) {
              const msg =
                err instanceof Error ? err.message : 'No se pudo desactivar.';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const utility = useMemo(() => {
    const cost = parseNumber(form.cost) ?? 0;
    const price = parseNumber(form.price) ?? 0;
    if (price <= 0) {
      return null;
    }
    const margin = price - cost;
    const pct = (margin / price) * 100;
    return { margin, pct };
  }, [form.cost, form.price]);

  return (
    <Screen scroll contentStyle={styles.content}>
      <TextField
        label="Nombre"
        value={form.name}
        onChangeText={t => set('name', t)}
        placeholder="Ej. AGUA DOÑA VITA 1.5 LT"
        autoCapitalize="characters"
        errorText={errors.name}
        leftIcon={<AppIcon name="tag-text" />}
      />
      <TextField
        label="Código de barras (opcional)"
        value={form.barcode}
        onChangeText={t => set('barcode', t)}
        placeholder="7503033076842"
        keyboardType="number-pad"
        autoCapitalize="none"
        leftIcon={<AppIcon name="barcode-scan" />}
      />
      <Button
        label="Escanear con cámara"
        variant="secondary"
        size="medium"
        onPress={() =>
          navigation.navigate('BarcodeScanner', {
            returnTo: 'ProductForm',
            returnToKey: route.key,
          })
        }
        leftIcon={<AppIcon name="camera" color={colors.textPrimary} />}
        fullWidth={false}
      />
      <TextField
        label="Categoría"
        value={form.category}
        onChangeText={t => set('category', t)}
        placeholder="Ej. AJE, ALPURA, ABARROTES"
        autoCapitalize="characters"
        leftIcon={<AppIcon name="shape" />}
      />

      <View style={styles.row}>
        <View style={styles.col}>
          <TextField
            label="Costo"
            value={form.cost}
            onChangeText={t => set('cost', t)}
            placeholder="0.00"
            keyboardType="decimal-pad"
            errorText={errors.cost}
            leftIcon={<AppIcon name="cash-minus" />}
          />
        </View>
        <View style={styles.col}>
          <TextField
            label="Precio"
            value={form.price}
            onChangeText={t => set('price', t)}
            placeholder="0.00"
            keyboardType="decimal-pad"
            errorText={errors.price}
            leftIcon={<AppIcon name="cash-plus" />}
          />
        </View>
      </View>

      {utility ? (
        <View style={styles.utility}>
          <Text style={styles.utilityLabel}>Margen estimado</Text>
          <Text style={styles.utilityValue}>
            ${utility.margin.toFixed(2)} ({utility.pct.toFixed(1)}%)
          </Text>
        </View>
      ) : null}

      <TextField
        label="Stock (existencias)"
        value={form.stock}
        onChangeText={t => set('stock', t)}
        placeholder="0"
        keyboardType="number-pad"
        errorText={errors.stock}
        leftIcon={<AppIcon name="warehouse" />}
      />
      <TextField
        label="Stock mínimo (alerta)"
        value={form.stockMin}
        onChangeText={t => set('stockMin', t)}
        placeholder="10"
        keyboardType="number-pad"
        errorText={errors.stockMin}
        leftIcon={<AppIcon name="alert" color={colors.warning} />}
      />

      {isEditing ? (
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Producto activo</Text>
            <Text style={styles.toggleHint}>
              Cuando está apagado, no aparece en la caja.
            </Text>
          </View>
          <Switch
            value={form.active}
            onValueChange={v => set('active', v)}
            trackColor={{ false: colors.border, true: colors.success }}
          />
        </View>
      ) : null}

      <Button
        label={isEditing ? 'Guardar cambios' : 'Crear producto'}
        variant="primary"
        loading={submitting}
        onPress={handleSave}
      />

      {isEditing ? (
        <Button
          label="Desactivar producto"
          variant="danger"
          size="medium"
          onPress={handleDelete}
          style={{ marginTop: spacing.md }}
        />
      ) : null}
    </Screen>
  );
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseInteger(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  col: {
    flex: 1,
  },
  utility: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  utilityLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  utilityValue: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  toggleLabel: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  toggleHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
