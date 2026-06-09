import { getMeta, setMeta } from '../database/metaRepo';
import {
  LICENSE_CONFIG,
  META_DEVICE_ID,
  META_GRACE_HOURS,
  META_LAST_OK,
  META_LAST_STATUS,
} from './licenseConfig';

// ─── Tipos públicos ──────────────────────────────────────────────────────────

export type LicenseErrorReason =
  | 'not_found'        // La clave no existe en el servidor
  | 'inactive'         // Licencia suspendida o revocada por el admin
  | 'expired'          // Licencia expirada o periodo offline agotado
  | 'device_mismatch'  // La clave ya está vinculada a otro dispositivo
  | 'product_mismatch' // La clave no corresponde a este programa
  | 'network'          // Sin conexión y sin caché válida previa
  | 'invalid_response';

export type LicenseResult =
  | { ok: true;  source: 'server' }
  | { ok: true;  source: 'cache'; hoursLeft: number }
  | { ok: false; reason: LicenseErrorReason };

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Valida la licencia contra el servidor ecommer.
 * Si no hay conexión, intenta usar el caché de la última validación exitosa
 * dentro del período de gracia configurado.
 *
 * Usar en cada login del usuario (después de que la licencia ya está activada).
 */
export async function validateLicense(licenseKey: string): Promise<LicenseResult> {
  const deviceId = getOrCreateDeviceId();
  const now = Date.now();

  try {
    const response = await callServer(licenseKey, deviceId);

    if (response === null) {
      // El servidor respondió pero con formato inesperado → usar caché
      return fallbackCache(now);
    }

    if (!response.valid) {
      // Respuesta negativa definitiva del servidor → limpiar caché
      setMeta(META_LAST_STATUS, response.code ?? 'invalid');
      setMeta(META_LAST_OK, '0');
      return { ok: false, reason: codeToReason(response.code) };
    }

    // Validación exitosa → actualizar caché
    setMeta(META_LAST_STATUS, 'active');
    setMeta(META_LAST_OK, String(now));
    setMeta(META_GRACE_HOURS, String(LICENSE_CONFIG.DEFAULT_GRACE_HOURS));
    return { ok: true, source: 'server' };

  } catch {
    // Timeout, sin red, etc. → intentar con caché
    return fallbackCache(now);
  }
}

/**
 * Activa la licencia por primera vez contra el servidor. NO usa caché:
 * si no hay red, lanza un Error. El servidor vincula la clave a este
 * dispositivo (device_fingerprint) en esta primera llamada.
 *
 * Usar únicamente desde la pantalla de activación inicial.
 */
export async function activateLicenseOnServer(licenseKey: string): Promise<void> {
  const deviceId = getOrCreateDeviceId();

  let response: ServerResponse | null;
  try {
    response = await callServer(licenseKey, deviceId);
  } catch {
    throw new Error(
      'Sin conexión a internet. Necesitas red para activar la licencia por primera vez.',
    );
  }

  if (response === null) {
    throw new Error(
      'El servidor no respondió correctamente. Intenta de nuevo.',
    );
  }

  if (!response.valid) {
    throw new Error(reasonMessage(codeToReason(response.code)));
  }

  // Guardar caché de activación exitosa
  const now = Date.now();
  setMeta(META_LAST_STATUS, 'active');
  setMeta(META_LAST_OK, String(now));
  setMeta(META_GRACE_HOURS, String(LICENSE_CONFIG.DEFAULT_GRACE_HOURS));
}

/** Traduce un LicenseErrorReason a un mensaje legible para el usuario. */
export function reasonMessage(reason: LicenseErrorReason): string {
  switch (reason) {
    case 'not_found':
      return 'Clave de licencia no encontrada. Verifica que sea correcta.';
    case 'device_mismatch':
      return 'Esta licencia ya está activada en otro dispositivo. Contacta al proveedor para transferirla.';
    case 'inactive':
      return 'La licencia está suspendida o revocada. Contacta al proveedor.';
    case 'expired':
      return 'La licencia ha expirado. Renueva tu plan.';
    case 'product_mismatch':
      return 'Esta clave no corresponde a este programa. Verifica que sea la licencia correcta.';
    case 'network':
      return 'Sin conexión a internet. Conecta y vuelve a intentarlo.';
    case 'invalid_response':
      return 'Respuesta inesperada del servidor. Intenta de nuevo.';
  }
}

// ─── Privado ─────────────────────────────────────────────────────────────────

type ServerResponse = {
  valid: boolean;
  code?: string;
  message?: string;
};

/**
 * Llama al endpoint POST /api/v1/validate-license del ecommer.
 * Devuelve null si la respuesta no tiene el formato esperado.
 * Lanza si hay error de red / timeout.
 */
async function callServer(
  licenseKey: string,
  deviceId: string,
): Promise<ServerResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    LICENSE_CONFIG.REQUEST_TIMEOUT_MS,
  );

  try {
    const resp = await fetch(
      `${LICENSE_CONFIG.BASE_URL}/api/v1/validate-license`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-License-Api-Key': LICENSE_CONFIG.SERVER_API_KEY,
        },
        body: JSON.stringify({
          license_key:        licenseKey,
          product_sku:        LICENSE_CONFIG.PRODUCT_SKU,
          device_fingerprint: deviceId,
        }),
        signal: controller.signal,
      },
    );

    const json = await resp.json().catch(() => null);
    if (!json || typeof json.valid !== 'boolean') return null;
    return json as ServerResponse;
  } finally {
    clearTimeout(timer);
  }
}

/** Intenta validar usando el caché de la última sesión exitosa. */
function fallbackCache(now: number): LicenseResult {
  const lastOk = Number(getMeta(META_LAST_OK) ?? '0');
  if (!Number.isFinite(lastOk) || lastOk <= 0) {
    return { ok: false, reason: 'network' };
  }

  const graceHours = Number(
    getMeta(META_GRACE_HOURS) ?? String(LICENSE_CONFIG.DEFAULT_GRACE_HOURS),
  );
  const elapsed = now - lastOk;
  const graceMs = graceHours * 3_600_000;

  if (elapsed <= graceMs) {
    const hoursLeft = Math.ceil((graceMs - elapsed) / 3_600_000);
    return { ok: true, source: 'cache', hoursLeft };
  }

  return { ok: false, reason: 'expired' };
}

/** Mapea los códigos de error del ecommer a los tipos internos de la app. */
function codeToReason(code?: string): LicenseErrorReason {
  switch (code) {
    case 'LICENSE_NOT_FOUND':  return 'not_found';
    case 'DEVICE_MISMATCH':    return 'device_mismatch';
    case 'LICENSE_INACTIVE':   return 'inactive';
    case 'LICENSE_EXPIRED':    return 'expired';
    case 'PRODUCT_MISMATCH':   return 'product_mismatch';
    default:                   return 'inactive';
  }
}

/** Devuelve el device_id existente o genera uno nuevo y lo persiste. */
function getOrCreateDeviceId(): string {
  const existing = getMeta(META_DEVICE_ID);
  if (existing) return existing;
  const id = `pvt_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  setMeta(META_DEVICE_ID, id);
  return id;
}
