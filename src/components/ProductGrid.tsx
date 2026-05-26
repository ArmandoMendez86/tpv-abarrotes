import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ProductRow } from '../database/models';
import { searchProducts } from '../database/productsRepo';
import { colors, radii, sizes, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';

type Props = {
  onPickProduct: (product: ProductRow) => void;
  /** Cantidades actuales en el carrito por id, para mostrar el badge. */
  quantitiesById: Record<number, number>;
};

const SEARCH_DEBOUNCE_MS = 120;
const PAGE_SIZE = 60;

/**
 * Catálogo táctil para el cajero. Tres piezas:
 *  - Barra de búsqueda (nombre, categoría o código de barras exacto).
 *  - Cuadrícula de productos con tarjetas grandes y precio destacado.
 *  - Badge con la cantidad ya agregada al ticket actual (refuerzo visual).
 *
 * La consulta a SQLite se hace dentro de un debounce muy corto (120ms) para
 * que el cajero pueda teclear sin sentir lag, sin saturar al motor.
 */
export function ProductGrid({ onPickProduct, quantitiesById }: Props) {
  const { width } = useWindowDimensions();
  const numColumns = width >= 900 ? 3 : 2;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [products, setProducts] = useState<ProductRow[]>(() =>
    searchProducts('', PAGE_SIZE),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  useEffect(() => {
    setProducts(searchProducts(debouncedQuery, PAGE_SIZE));
  }, [debouncedQuery]);

  const headerHint = useMemo(() => {
    if (query.trim().length === 0) {
      return 'Mostrando los primeros 60 productos. Escribe para buscar.';
    }
    return `${products.length} resultado${products.length === 1 ? '' : 's'}`;
  }, [query, products.length]);

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar producto, categoría o escanear código…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => setQuery('')}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Limpiar búsqueda">
            <Text style={styles.clearBtnLabel}>×</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.hint}>{headerHint}</Text>

      <FlatList
        key={`grid-${numColumns}`}
        data={products}
        keyExtractor={item => String(item.id)}
        numColumns={numColumns}
        columnWrapperStyle={
          numColumns > 1 ? { gap: spacing.md } : undefined
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyBody}>
              Revisa la ortografía o intenta con otra parte del nombre.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={onPickProduct}
            inCart={quantitiesById[item.id] ?? 0}
          />
        )}
      />
    </View>
  );
}

function ProductCard({
  product,
  onPress,
  inCart,
}: {
  product: ProductRow;
  onPress: (p: ProductRow) => void;
  inCart: number;
}) {
  return (
    <Pressable
      onPress={() => onPress(product)}
      accessibilityRole="button"
      accessibilityLabel={`Agregar ${product.name}`}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        inCart > 0 && styles.cardInCart,
      ]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardName} numberOfLines={3}>
          {product.name}
        </Text>
        {product.category ? (
          <Text style={styles.cardCategory} numberOfLines={1}>
            {product.category}
          </Text>
        ) : null}
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.cardPrice}>{formatCurrency(product.price)}</Text>
        {inCart > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{inCart}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
  },
  searchWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchInput: {
    minHeight: sizes.inputHeight,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingRight: 48,
    color: colors.textPrimary,
    fontSize: 18,
  },
  clearBtn: {
    position: 'absolute',
    right: spacing.md,
    top: 6,
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  clearBtnLabel: {
    fontSize: 28,
    color: colors.textMuted,
    lineHeight: 30,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  listContent: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  card: {
    flex: 1,
    minHeight: 130,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  cardPressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.98 }],
  },
  cardInCart: {
    borderColor: colors.success,
    backgroundColor: '#ECFDF5',
  },
  cardTop: {
    gap: spacing.xs,
  },
  cardName: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  cardCategory: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  cardPrice: {
    ...typography.title,
    color: colors.success,
  },
  badge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
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
