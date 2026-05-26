import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { authenticate } from '../database/usersRepo';
import type { UserRow } from '../database/models';
import { validateLicenseOrThrow } from '../licensing/licenseClient';

type AuthContextValue = {
  user: UserRow | null;
  /**
   * Intenta iniciar sesión contra la tabla 'usuarios' en SQLite.
   * Devuelve el usuario si las credenciales son válidas, o null si no.
   * Las pantallas son responsables de mostrar el error al usuario.
   */
  signIn: (username: string, password: string) => Promise<UserRow | null>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Provider de sesión. Mantiene en memoria al usuario activo. En esta fase
 * la sesión NO se persiste entre reinicios de la app; cada arranque vuelve
 * a Login. Cuando se requiera "recordar sesión", aquí es donde sumaremos
 * AsyncStorage o MMKV.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRow | null>(null);

  const signIn = useCallback(async (username: string, password: string) => {
    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      return null;
    }
    const found = authenticate(trimmedUser, password);
    if (!found) {
      return null;
    }

    // Validación de licencia: si está inactiva, bloquea la app.
    await validateLicenseOrThrow({ username: found.username });

    setUser(found);
    return found;
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, signIn, signOut }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return ctx;
}
