import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authenticate } from '../database/usersRepo';
import type { UserRow } from '../database/models';
import {
  activateLicenseOnServer,
  reasonMessage,
  validateLicense,
} from '../licensing/licenseClient';
import { getMeta, setMeta } from '../database/metaRepo';
import { META_LICENSE_KEY } from '../licensing/licenseConfig';

export type LicenseWarning = { hoursLeft: number };

type AuthContextValue = {
  user: UserRow | null;
  /** Clave ECOM-XXXX almacenada en el dispositivo. null = no activada aún. */
  licenseKey: string | null;
  licenseWarning: LicenseWarning | null;
  /** true mientras se lee el estado inicial de la DB (splash breve). */
  isBootingLicense: boolean;
  signIn: (username: string, password: string) => Promise<UserRow | null>;
  signOut: () => void;
  /**
   * Activa la licencia por primera vez: valida contra el servidor y,
   * si es válida, persiste la clave en el dispositivo.
   * Lanza Error con mensaje legible si la validación falla.
   */
  activateLicense: (key: string) => Promise<void>;
  /**
   * Elimina la clave del dispositivo (para cambiar de licencia o
   * en caso de soporte técnico). No revoca la licencia en el servidor.
   */
  deactivateLicense: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                         = useState<UserRow | null>(null);
  const [licenseKey, setLicenseKey]             = useState<string | null>(null);
  const [licenseWarning, setLicenseWarning]     = useState<LicenseWarning | null>(null);
  const [isBootingLicense, setIsBootingLicense] = useState(true);

  // Leer la clave guardada en SQLite al montar (operación síncrona, muy rápida)
  useEffect(() => {
    const stored = getMeta(META_LICENSE_KEY);
    setLicenseKey(stored && stored.length > 0 ? stored : null);
    setIsBootingLicense(false);
  }, []);

  const activateLicense = useCallback(async (key: string) => {
    const trimmed = key.trim().toUpperCase();
    // Lanza Error si la validación falla → la pantalla muestra el mensaje
    await activateLicenseOnServer(trimmed);
    setMeta(META_LICENSE_KEY, trimmed);
    setLicenseKey(trimmed);
    // RootNavigator detecta licenseKey !== null y monta el AuthStack automáticamente
  }, []);

  const deactivateLicense = useCallback(() => {
    setMeta(META_LICENSE_KEY, '');
    setLicenseKey(null);
    setUser(null);
    setLicenseWarning(null);
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const trimmedUser = username.trim();
    if (!trimmedUser || !password) return null;

    const found = authenticate(trimmedUser, password);
    if (!found) return null;

    const storedKey = getMeta(META_LICENSE_KEY);
    if (!storedKey) {
      throw new Error('No hay licencia activada en este dispositivo.');
    }

    const result = await validateLicense(storedKey);

    if (!result.ok) {
      throw new Error(reasonMessage(result.reason));
    }

    setLicenseWarning(
      result.source === 'cache' ? { hoursLeft: result.hoursLeft } : null,
    );
    setUser(found);
    return found;
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    setLicenseWarning(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      licenseKey,
      licenseWarning,
      isBootingLicense,
      signIn,
      signOut,
      activateLicense,
      deactivateLicense,
    }),
    [
      user, licenseKey, licenseWarning, isBootingLicense,
      signIn, signOut, activateLicense, deactivateLicense,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}
