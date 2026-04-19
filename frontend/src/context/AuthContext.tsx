import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth as authApi, type AuthUser } from "../api/endpoints";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface LoginOptions {
  remember?: boolean;
  refreshToken?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User, options?: LoginOptions) => void;
  updateTokens: (accessToken: string, refreshToken?: string) => void;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthState | undefined>(undefined);

const TOKEN_KEY = "cosmicsec_token";
const REFRESH_TOKEN_KEY = "cosmicsec_refresh_token";
const USER_KEY = "cosmicsec_user";
const REMEMBER_KEY = "cosmicsec_remember_me";

function readStoredValue(key: string): string | null {
  const local = localStorage.getItem(key);
  if (local) return local;
  return sessionStorage.getItem(key);
}

function clearStoredValue(key: string): void {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

function setStoredValue(key: string, value: string, remember: boolean): void {
  // Keep auth state available to both code paths that read localStorage and
  // those that read sessionStorage. The remember-me flag still controls the
  // refresh-token UX, but access to the current session remains consistent.
  if (remember) {
    localStorage.setItem(key, value);
    sessionStorage.setItem(key, value);
    return;
  }
  sessionStorage.setItem(key, value);
  localStorage.setItem(key, value);
}

function normalizeUser(user: Partial<AuthUser> | null | undefined): User | null {
  if (!user?.email) return null;
  return {
    id: String(user.id ?? user.email),
    email: String(user.email),
    full_name: String(user.full_name ?? user.email.split("@")[0]),
    role: String(user.role ?? "viewer"),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredValue(TOKEN_KEY));
  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    readStoredValue(REFRESH_TOKEN_KEY),
  );
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem(REMEMBER_KEY) === "true";
  });
  const [user, setUser] = useState<User | null>(() => {
    const stored = readStoredValue(USER_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      if (!token) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const me = await authApi.me();
        if (cancelled) return;
        const normalized = normalizeUser(me);
        if (!normalized) {
          clearStoredValue(TOKEN_KEY);
          clearStoredValue(REFRESH_TOKEN_KEY);
          clearStoredValue(USER_KEY);
          setToken(null);
          setRefreshToken(null);
          setUser(null);
          return;
        }
        setUser(normalized);
        setStoredValue(USER_KEY, JSON.stringify(normalized), rememberMe);
      } catch {
        if (cancelled) return;
        clearStoredValue(TOKEN_KEY);
        clearStoredValue(REFRESH_TOKEN_KEY);
        clearStoredValue(USER_KEY);
        setToken(null);
        setRefreshToken(null);
        setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrapAuth();
    return () => {
      cancelled = true;
    };
  }, [token, rememberMe]);

  const login = useCallback(
    (newToken: string, newUser: User, options?: LoginOptions) => {
      const remember = options?.remember ?? rememberMe;
      setRememberMe(remember);
      localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");

      setStoredValue(TOKEN_KEY, newToken, remember);
      setStoredValue(USER_KEY, JSON.stringify(newUser), remember);

      if (options?.refreshToken) {
        setStoredValue(REFRESH_TOKEN_KEY, options.refreshToken, remember);
        setRefreshToken(options.refreshToken);
      }

      setToken(newToken);
      setUser(newUser);
    },
    [rememberMe],
  );

  const updateTokens = useCallback(
    (accessToken: string, nextRefreshToken?: string) => {
      setStoredValue(TOKEN_KEY, accessToken, rememberMe);
      setToken(accessToken);
      if (nextRefreshToken) {
        setStoredValue(REFRESH_TOKEN_KEY, nextRefreshToken, rememberMe);
        setRefreshToken(nextRefreshToken);
      }
    },
    [rememberMe],
  );

  const logout = useCallback(() => {
    clearStoredValue(TOKEN_KEY);
    clearStoredValue(REFRESH_TOKEN_KEY);
    clearStoredValue(USER_KEY);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      refreshToken,
      isLoading,
      isAuthenticated: !!token && !!user,
      login,
      updateTokens,
      logout,
    }),
    [user, token, refreshToken, isLoading, login, updateTokens, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
