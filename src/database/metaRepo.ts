import { getDb } from './database';

export function getMeta(key: string): string | null {
  const res = getDb().execute(
    `SELECT value FROM app_meta WHERE key = ? LIMIT 1;`,
    [key],
  );
  return (res.rows?._array?.[0]?.value as string | undefined) ?? null;
}

export function setMeta(key: string, value: string): void {
  getDb().execute(`INSERT OR REPLACE INTO app_meta(key, value) VALUES (?,?);`, [
    key,
    value,
  ]);
}

