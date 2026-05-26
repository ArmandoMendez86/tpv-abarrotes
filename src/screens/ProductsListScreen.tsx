import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../components/AppIcon';
import { Button } from '../components/Button';
import type { ProductRow } from '../database/models';
import { listProductsForAdmin } from '../database/productsRepo';
import type { AdminStackParamList } from '../navigation/types';
import { colors, radii, sizes, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';

type Props = NativeStackScreenProps<AdminStackParamList, 'ProductsList'>;

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 150;

/**
 * Listado del catálogo para el Administrador. Diferencias clave respecto a la
 * vista del Vendedor:
 *  - Muestra productos inactivos (con etiqueta visible).
 *  - Cada renglón abre el formulario de edición.
 *  - Botón flotante "+ Nuevo" siempre visible para añadir un producto.
 *  - Paginación incremental (carga más al hacer scroll cerca del final).
 */
export function ProductsListScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(
      () => setDebouncedQuery(query),
      SEARCH_DEBOUNCE_MS,
    );
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const loadFirstPage = useCallback(() => {
    const first = listProductsForAdmin(debouncedQuery, PAGE_SIZE, 0);
    setProducts(first);
    setHasMore(first.length === PAGE_SIZE);
  }, [debouncedQuery]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  // Refresca al regresar del formulario para reflejar cambios.
  useFocusEffect(
    useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage]),
  );

  const loadMore = useCallback(() => {
    if (!hasMore) {
      return;
    }
    const next = listProductsForAdmin(
      debouncedQuery,
      PAGE_SIZE,
      products.length,
    );
    if (next.length === 0) {
      setHasMore(false);
      return;
    }
    setProducts(prev => [...prev, ...next]);
    if (next.length < PAGE_SIZE) {
      setHasMore(false);
    }
  }, [debouncedQuery, hasMore, products.length]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.searchWrap}>
        <View style={styles.searchIcon}>
          <AppIcon name="magnify" size={22} color={colors.textMuted} />
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nombre, categoría o código…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => setQuery('')}
            style={styles.clearBtn}
            accessibilityLabel="Limpiar búsqueda">
            <AppIcon name="close-circle" size={24} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={products}
        keyExtractor={p => String(p.id)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin productos</Text>
            <Text style={styles.emptyBody}>
              Cambia los filtros de búsqueda o crea un producto nuevo.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductRowItem
            product={item}
            onPress={() =>
              navigation.navigate('ProductForm', { productId: item.id })
            }
          />
        )}
      />

      <View style={styles.fabWrap}>
        <Button
          label="+ Nuevo producto"
          variant="primary"
          onPress={() => navigation.navigate('ProductForm', {})}
        />
      </View>
    </SafeAreaView>
  );
}

function ProductRowItem({
  product,
  onPress,
}: {
  product: ProductRow;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.surfaceMuted },
      ]}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowName} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.rowMetaLine}>
          {product.category ? (
            <Text style={styles.rowMeta}>{product.category}</Text>
          ) : null}
          {product.barcode ? (
            <Text style={styles.rowMetaMono}>{product.barcode}</Text>
          ) : null}
          {product.active === 0 ? (
            <View style={styles.inactiveTag}>
              <Text style={styles.inactiveTagText}>Inactivo</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowPrice}>{formatCurrency(product.price)}</Text>
        <Text style={styles.rowStock}>Stock: {product.stock}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchWrap: {
    position: 'relative',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.lg + 14,
    top: spacing.md + 22,
    height: 24,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  searchInput: {
    minHeight: sizes.inputHeight,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingLeft: 48,
    paddingRight: 48,
    color: colors.textPrimary,
    fontSize: 18,
  },
  clearBtn: {
    position: 'absolute',
    right: spacing.lg + 4,
    top: spacing.md + 16,
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    flexGrow: 1,
  },
  separator: {
    height: spacing.sm,
  },
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 76,
    gap: spacing.lg,
  },
  rowLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  rowName: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  rowMetaLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rowMetaMono: {
    ...typography.caption,
    color: colors.textMuted,
  },
  inactiveTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: '#FEE2E2',
    borderRadius: radii.pill,
  },
  inactiveTagText: {
    ...typography.caption,
    color: colors.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rowPrice: {
    ...typography.subtitle,
    color: colors.success,
  },
  rowStock: {
    ...typography.caption,
    color: colors.textSecondary,
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
  fabWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
});
