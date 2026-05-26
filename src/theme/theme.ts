/**
 * Tokens del sistema de diseño de TPV.
 *
 * Reglas de oro de la UI del POS:
 *  - Cajeros operan rápido y sin mirar de cerca: tipografía grande, contraste claro.
 *  - Botones de acción principal con altura mínima de 64dp para pulgar grueso
 *    (Material recomienda 48 como mínimo; aquí lo subimos por entorno de
 *    abarrotes con prisa y posibles guantes).
 *  - Paleta "ejecutiva y suave": fondo casi blanco, gris pizarra para texto,
 *    azul profundo como acción primaria, verde para "Cobrar" (la acción más
 *    importante del flujo), rojo sólo cuando es destructivo / peligroso.
 *  - Nada de magenta, neón ni gradientes. Nada que canse la vista en jornadas
 *    de 8+ horas.
 */

export const colors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',

  primary: '#1D4ED8',
  primaryPressed: '#1E40AF',

  success: '#047857',
  successPressed: '#065F46',

  danger: '#B91C1C',
  dangerPressed: '#991B1B',

  warning: '#B45309',

  focusRing: '#3B82F6',

  // Acentos cálidos para piezas de marca (login, splash, headers de bienvenida).
  // Inspiración: rojo "tienda mexicana" + dorado de etiqueta de abarrotes.
  brandRed: '#C0392B',
  brandRedDeep: '#922B21',
  brandGold: '#F5B700',
  brandCream: '#FFF7E6',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '700' as const, lineHeight: 38 },
  title: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  subtitle: { fontSize: 17, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  button: { fontSize: 18, fontWeight: '700' as const, lineHeight: 22 },
  amount: { fontSize: 36, fontWeight: '800' as const, lineHeight: 40 },
} as const;

/** Alturas mínimas usadas por nuestros controles táctiles. */
export const sizes = {
  buttonLarge: 64,
  buttonMedium: 52,
  inputHeight: 60,
  iconButton: 56,
} as const;

export type Theme = {
  colors: typeof colors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  sizes: typeof sizes;
};

export const theme: Theme = { colors, spacing, radii, typography, sizes };
