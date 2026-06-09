/**
 * Configuración del sistema de licencias.
 *
 * IMPORTANTE: Antes de publicar la app en producción:
 *  1. Cambia BASE_URL por la URL real de tu servidor ecommer.
 *  2. Cambia SERVER_API_KEY por el valor de LICENSE_API_KEY en el .env del ecommer.
 *  3. Verifica que PRODUCT_SKU coincida con el SKU del producto en el catálogo.
 */
export const LICENSE_CONFIG = {
  /** URL base del backend ecommer (sin barra al final). */
  BASE_URL: 'https://sistemasdecobro.com.mx',

  /**
   * Debe coincidir EXACTAMENTE con la variable LICENSE_API_KEY
   * del archivo .env del ecommer.
   */
  SERVER_API_KEY: 'Kysx3CB57RWZYCiAKkZjw8hPh7TsgHf1swV2VQkszcCPE7xmy90xHRodlQuChVGt',

  /** SKU del producto "POS Abarrotes Pro" en el catálogo del ecommer. */
  PRODUCT_SKU: 'POS-ABR-001',

  /** Timeout para peticiones HTTP al servidor (milisegundos). */
  REQUEST_TIMEOUT_MS: 8_000,

  /**
   * Horas de gracia sin conexión.
   * Permite que el app funcione offline después de la última validación exitosa.
   * Si el servidor no especifica un valor, se usa éste como fallback.
   */
  DEFAULT_GRACE_HOURS: 72,
} as const;

// ─── Claves usadas en la tabla app_meta (SQLite) ────────────────────────────

/** Clave ECOM-XXXX guardada tras la activación exitosa. */
export const META_LICENSE_KEY = 'license_key';

/** Identificador único del dispositivo, generado una sola vez al instalar. */
export const META_DEVICE_ID = 'device_id';

/** Timestamp (ms) de la última validación exitosa contra el servidor. */
export const META_LAST_OK = 'license_last_ok_at_ms';

/** Último estado de licencia recibido del servidor ('active' | código de error). */
export const META_LAST_STATUS = 'license_last_status';

/** Horas de gracia offline devueltas por el servidor en la última validación. */
export const META_GRACE_HOURS = 'license_grace_hours';
