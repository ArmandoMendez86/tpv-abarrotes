import { Platform } from 'react-native';
import { getMeta, setMeta } from '../database/metaRepo';

// Cambia esto si mueves el backend.
// Preferimos HTTPS; si falla (hosting sin SSL), hacemos fallback a HTTP.
const BASE_URL_HTTPS = 'https://tpv.damedominio.xyz';
const BASE_URL_HTTP = 'http://tpv.damedominio.xyz';
const CHECK_PATH = '/api/v1/license/check';

const META_DEVICE_ID = 'device_id';
const META_LAST_OK = 'license_last_ok_at_ms';
const META_LAST_STATUS = 'license_last_status';

// Para no “romper” el POS si el servidor cae: permitimos seguir usando la app
// si la última validación fue reciente.
const GRACE_MS = 24 * 60 * 60 * 1000; // 24h

export type LicenseResult =
  | { ok: true; source: 'server' | 'cache' }
  | { ok: false; reason: 'inactive' | 'network' | 'invalid_response' };

export async function validateLicenseOrThrow(input: {
  username: string;
  deviceName?: string | null;
}): Promise<void> {
  const res = await validateLicense(input);
  if (res.ok) return;
  if (res.reason === 'inactive') {
    throw new Error(
      'Tu licencia está INACTIVA. Contacta al administrador: Ing. Armando (7471228268).',
    );
  }
  if (res.reason === 'network') {
    throw new Error(
      'No se pudo validar la licencia (revisa internet/SSL/DNS) y no hay validación reciente.',
    );
  }
  throw new Error('Respuesta inválida al validar licencia.');
}

export async function validateLicense(input: {
  username: string;
  deviceName?: string | null;
}): Promise<LicenseResult> {
  const deviceId = getOrCreateDeviceId();
  const now = Date.now();

  // 1) Intento contra servidor
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

    const body = {
      api_key: 'PVT_DEMO_KEY', // cámbialo en producción y en backend
      device_id: deviceId,
      device_name: input.deviceName ?? null,
      username: input.username,
      platform: Platform.OS,
      app_version: '0.0.1',
      ts: now,
    };

    const resp = await fetchWithFallback(
      [`${BASE_URL_HTTPS}${CHECK_PATH}`, `${BASE_URL_HTTP}${CHECK_PATH}`],
      {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    if (!resp.ok) {
      return fallbackCache(now);
    }

    const json = (await resp.json()) as
      | { active: boolean; message?: string }
      | undefined;

    if (!json || typeof json.active !== 'boolean') {
      return fallbackCache(now);
    }

    setMeta(META_LAST_STATUS, json.active ? 'active' : 'inactive');

    if (!json.active) {
      return { ok: false, reason: 'inactive' };
    }

    setMeta(META_LAST_OK, String(now));
    return { ok: true, source: 'server' };
  } catch {
    // 2) Caída de red/timeout: usamos caché si aplica
    return fallbackCache(now);
  }
}

async function fetchWithFallback(
  urls: string[],
  init: RequestInit,
): Promise<Response> {
  let lastErr: unknown = null;
  for (const url of urls) {
    try {
      return await fetch(url, init);
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr ?? new Error('fetch_failed');
}

function fallbackCache(now: number): LicenseResult {
  const lastOkRaw = getMeta(META_LAST_OK);
  const lastOk = lastOkRaw ? Number(lastOkRaw) : 0;
  if (Number.isFinite(lastOk) && lastOk > 0 && now - lastOk <= GRACE_MS) {
    return { ok: true, source: 'cache' };
  }
  return { ok: false, reason: 'network' };
}

function getOrCreateDeviceId(): string {
  const existing = getMeta(META_DEVICE_ID);
  if (existing) return existing;
  const id = generateId();
  setMeta(META_DEVICE_ID, id);
  return id;
}

function generateId(): string {
  // ID estable por instalación (no depende de AndroidId para no requerir permisos).
  return `pvt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

