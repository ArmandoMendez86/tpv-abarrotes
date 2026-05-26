import { useCallback, useMemo, useState } from 'react';
import type { ProductRow } from '../database/models';

export interface CartLine {
  productId: number;
  barcode: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface UseCartApi {
  lines: CartLine[];
  total: number;
  itemCount: number;
  /** Suma 1 unidad del producto al carrito (o lo añade si no existía). */
  addProduct: (product: ProductRow) => void;
  setQuantity: (productId: number, quantity: number) => void;
  increment: (productId: number) => void;
  decrement: (productId: number) => void;
  removeLine: (productId: number) => void;
  clear: () => void;
}

/**
 * Estado del carrito de una venta. Mantenemos:
 *  - 'productId' como llave (no permitimos dos renglones del mismo producto;
 *    si se vuelve a tocar, se incrementa la cantidad).
 *  - 'unitPrice' congelado al momento de agregarlo: si el admin cambia el
 *    precio mientras hay un ticket abierto, ese ticket conserva el precio.
 */
export function useCart(): UseCartApi {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addProduct = useCallback((product: ProductRow) => {
    setLines(prev => {
      const idx = prev.findIndex(l => l.productId === product.id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          barcode: product.barcode,
          name: product.name,
          unitPrice: product.price,
          quantity: 1,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setLines(prev => {
      if (quantity <= 0) {
        return prev.filter(l => l.productId !== productId);
      }
      return prev.map(l =>
        l.productId === productId ? { ...l, quantity } : l,
      );
    });
  }, []);

  const increment = useCallback((productId: number) => {
    setLines(prev =>
      prev.map(l =>
        l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l,
      ),
    );
  }, []);

  const decrement = useCallback((productId: number) => {
    setLines(prev =>
      prev
        .map(l =>
          l.productId === productId ? { ...l, quantity: l.quantity - 1 } : l,
        )
        .filter(l => l.quantity > 0),
    );
  }, []);

  const removeLine = useCallback((productId: number) => {
    setLines(prev => prev.filter(l => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const total = useMemo(
    () => lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0),
    [lines],
  );

  const itemCount = useMemo(
    () => lines.reduce((acc, l) => acc + l.quantity, 0),
    [lines],
  );

  return {
    lines,
    total,
    itemCount,
    addProduct,
    setQuantity,
    increment,
    decrement,
    removeLine,
    clear,
  };
}
