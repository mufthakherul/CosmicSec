/**
 * useTokenRefresh — Periodically checks JWT expiry and attempts silent refresh.
 *
 * Checks every 60 seconds. If the token expires within 5 minutes, triggers a
 * silent refresh via POST /api/auth/refresh. Falls back to logout on failure.
 */
import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { auth as authApi } from "../api/endpoints";

const CHECK_INTERVAL = 60_000; // 60 seconds
const REFRESH_THRESHOLD = 5 * 60; // 5 minutes before expiry

function decodeJwtPayload(token: string): { exp?: number; [key: string]: unknown } | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function useTokenRefresh() {
  const { token, refreshToken, updateTokens, logout } = useAuth();
  const refreshingRef = useRef(false);

  const checkAndRefresh = useCallback(async () => {
    if (!token || !refreshToken || refreshingRef.current) return;

    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return;

    const now = Math.floor(Date.now() / 1000);
    const remaining = payload.exp - now;

    // Token already expired
    if (remaining <= 0) {
      logout();
      return;
    }

    // Token expires within threshold — attempt silent refresh
    if (remaining <= REFRESH_THRESHOLD) {
      refreshingRef.current = true;
      try {
        const response = await authApi.refresh(refreshToken);
        if (response.access_token) {
          updateTokens(response.access_token, response.refresh_token);
        }
      } catch {
        // Refresh failed — user must re-login
        logout();
      } finally {
        refreshingRef.current = false;
      }
    }
  }, [token, refreshToken, updateTokens, logout]);

  useEffect(() => {
    // Initial check
    checkAndRefresh();

    // Periodic interval
    const interval = setInterval(checkAndRefresh, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkAndRefresh]);
}
