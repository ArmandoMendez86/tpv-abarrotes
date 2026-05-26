/**
 * Formatea cualquier número como cantidad en pesos mexicanos: "$1,234.50".
 * Implementación manual (sin Intl) para garantizar compatibilidad en cualquier
 * build de Hermes y evitar discrepancias entre dispositivos.
 */
export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return '$0.00';
  }
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  const fixed = absolute.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}$${withThousands}.${decPart}`;
}
