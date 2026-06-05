'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiError,
  createBackofficeClient,
  staffLogin,
  staffLogout,
  staffRefresh,
} from '@/lib/api';
import {
  clearSession,
  loadAccessToken,
  loadRefreshToken,
  loadStaff,
  saveSession,
} from '@/lib/auth-storage';
import type { StaffProfile } from '@/lib/types';

interface AuthContextValue {
  accessToken: string | null;
  staff: StaffProfile | null;
  isReady: boolean;
  api: ReturnType<typeof createBackofficeClient> | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? loadAccessToken() : null,
  );
  const [staff, setStaff] = useState<StaffProfile | null>(() =>
    typeof window !== 'undefined' ? loadStaff() : null,
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setAccessToken(loadAccessToken());
    setStaff(loadStaff());
    setIsReady(true);
  }, []);

  const logout = useCallback(() => {
    const refresh = loadRefreshToken();
    if (refresh) {
      void staffLogout(refresh);
    }
    clearSession();
    setAccessToken(null);
    setStaff(null);
    router.replace('/login');
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await staffLogin(email, password);
    saveSession(result.accessToken, result.refreshToken, result.staff);
    setAccessToken(result.accessToken);
    setStaff(result.staff);
  }, []);

  const api = useMemo(
    () => (accessToken ? createBackofficeClient(accessToken) : null),
    [accessToken],
  );

  const value = useMemo(
    () => ({ accessToken, staff, isReady, api, login, logout }),
    [accessToken, staff, isReady, api, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function useApiErrorHandler() {
  const { logout } = useAuth();

  return useCallback(
    async (error: unknown): Promise<string> => {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          const refresh = loadRefreshToken();
          if (refresh) {
            try {
              const result = await staffRefresh(refresh);
              saveSession(
                result.accessToken,
                result.refreshToken,
                result.staff,
              );
              return 'Session refreshed — retry the action.';
            } catch {
              logout();
              return 'Session expired. Please sign in again.';
            }
          }
          logout();
          return 'Session expired. Please sign in again.';
        }
        return error.message;
      }
      if (error instanceof Error) {
        return error.message;
      }
      return 'Something went wrong';
    },
    [logout],
  );
}
