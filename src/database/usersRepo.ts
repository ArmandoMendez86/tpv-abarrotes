import { getDb } from './database';
import type { UserRole, UserRow } from './models';

/**
 * Verifica credenciales contra la tabla 'usuarios'. En esta fase la contraseña
 * se almacena en texto plano para simplificar (la app es 100% offline en el
 * dispositivo del comercio). Cuando llegue el momento, sustituir por un hash
 * (PBKDF2 / bcrypt) sin cambiar la API pública de este repositorio.
 */
export function authenticate(
  username: string,
  credential: string,
): UserRow | null {
  const trimmed = credential.trim();
  const res = getDb().execute(
    `SELECT id, username, full_name, role, active, created_at
       FROM usuarios
      WHERE username = ?
        AND active = 1
        AND (
          password = ?
          OR (pin IS NOT NULL AND pin = ?)
        )
      LIMIT 1;`,
    [username, trimmed, trimmed],
  );
  return (res.rows?._array?.[0] as UserRow | undefined) ?? null;
}

export function listUsers(): UserRow[] {
  const res = getDb().execute(
    `SELECT id, username, full_name, role, active, created_at
       FROM usuarios
      ORDER BY username;`,
  );
  return (res.rows?._array as UserRow[]) ?? [];
}

export function listVendors(options?: { onlyActive?: boolean }): UserRow[] {
  const onlyActive = options?.onlyActive ?? false;
  const res = getDb().execute(
    `SELECT id, username, full_name, role, active, created_at
       FROM usuarios
      WHERE role = 'Vendedor'
        AND (? = 0 OR active = 1)
      ORDER BY COALESCE(full_name, username);`,
    [onlyActive ? 1 : 0],
  );
  return (res.rows?._array as UserRow[]) ?? [];
}

export function createUser(input: {
  username: string;
  password: string;
  pin?: string;
  fullName?: string;
  role: UserRole;
}): number {
  const normalizedPin = normalizePin(input.pin);
  const safePassword = input.password ?? '';
  if (!input.username.trim()) {
    throw new Error('El usuario es obligatorio.');
  }
  if (!safePassword && !normalizedPin) {
    throw new Error('Captura una contraseña o un PIN de 4 dígitos.');
  }
  const res = getDb().execute(
    `INSERT INTO usuarios(username, password, pin, full_name, role)
     VALUES (?,?,?,?,?);`,
    [
      input.username.trim(),
      safePassword || generateThrowawayPassword(),
      normalizedPin,
      input.fullName ?? null,
      input.role,
    ],
  );
  return res.insertId ?? -1;
}

export function setUserActive(id: number, active: boolean): void {
  getDb().execute(`UPDATE usuarios SET active = ? WHERE id = ?;`, [
    active ? 1 : 0,
    id,
  ]);
}

export function setUserPin(id: number, pin: string | null): void {
  const normalized = normalizePin(pin ?? undefined);
  getDb().execute(`UPDATE usuarios SET pin = ? WHERE id = ?;`, [
    normalized,
    id,
  ]);
}

export function setUserPassword(id: number, password: string): void {
  const trimmed = password.trim();
  if (!trimmed) {
    throw new Error('La contraseña no puede estar vacía.');
  }
  getDb().execute(`UPDATE usuarios SET password = ? WHERE id = ?;`, [
    trimmed,
    id,
  ]);
}

function normalizePin(pin: string | undefined): string | null {
  if (!pin) {
    return null;
  }
  const trimmed = pin.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d{4}$/.test(trimmed)) {
    throw new Error('El PIN debe ser numérico de 4 dígitos.');
  }
  return trimmed;
}

function generateThrowawayPassword(): string {
  // Evita contraseñas vacías cuando el usuario se maneja solo por PIN.
  return `__pin_only__${Math.random().toString(16).slice(2)}${Date.now()}`;
}
