/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { ROUTES } from '@/app/router/route-paths';
import { authApi } from '@/features/auth/api/auth-api';
import { normalizeAuthResponse } from '@/features/auth/auth-mapper';
import { env } from '@/shared/config/env';
import { ROLES } from '@/shared/constants/roles';
import { getStoredUser, setStoredUser, clearStoredUser, getStoredToken, setStoredToken } from '@/features/auth/utils/auth-storage';
import { queryClient } from '@/app/query-client';
import { clearPersistedQueryCache } from '@/app/query-persist';
import { apiClient } from '@/shared/api/api-client';
import { accountApi } from '@/features/account/api/account-api';
import { normalizeAccountProfile } from '@/features/account/account-mapper';
import { normalizeHandle } from '@/shared/lib/user-paths';

export const AuthContext = createContext(null);

function createDevUser() {
  const role = env.devRole === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER;

  return {
    id: 999,
    handle: role === ROLES.ADMIN ? 'devadmin' : 'devrider',
    fullName: role === ROLES.ADMIN ? 'Development Admin' : 'Development Rider',
    email: role === ROLES.ADMIN ? 'admin@rydo.dev' : 'rider@rydo.dev',
    role,
  };
}

export function AuthProvider({ children }) {
  const [initialSession] = useState(() => {
    const savedUser = getStoredUser();
    const token = getStoredToken();

    if (savedUser) {
      return { user: savedUser, token };
    }

    if (env.devAuthEnabled) {
      return { user: createDevUser(), token: 'mock-dev-token' };
    }

    return { user: null, token: null };
  });
  const [user, setUser] = useState(initialSession.user);
  const isAuthReady = true;

  const applySession = useCallback(async (nextUser, token) => {
    await clearPersistedQueryCache();
    setUser(nextUser);
    setStoredUser(nextUser);
    setStoredToken(token);
    apiClient.setAuthToken(token);
    queryClient.invalidateQueries();
  }, []);

  const clearSession = useCallback(async (shouldRedirect = false) => {
    clearStoredUser();
    apiClient.setAuthToken(null);
    setUser(null);
    await clearPersistedQueryCache();

    if (shouldRedirect) {
      window.location.href = ROUTES.login;
    }
  }, []);

  useEffect(() => {
    if (initialSession.token) {
      apiClient.setAuthToken(initialSession.token);
    }

    if (initialSession.user) {
      setStoredUser(initialSession.user);
    }

    if (initialSession.token) {
      setStoredToken(initialSession.token);
    }
  }, [initialSession]);

  useEffect(() => {
    apiClient.setUnauthorizedHandler(() => clearSession(true));
    return () => apiClient.setUnauthorizedHandler(null);
  }, [clearSession]);

  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      setStoredUser(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!initialSession.token || !user?.id) return;
    if (normalizeHandle(user?.handle)) return;

    let cancelled = false;
    (async () => {
      try {
        const profile = normalizeAccountProfile(await accountApi.getProfile());
        if (cancelled || !normalizeHandle(profile.handle)) return;
        updateUser({
          handle: profile.handle,
          avatarUrl: profile.avatarUrl ?? user.avatarUrl,
          firstName: profile.firstName || user.firstName,
          lastName: profile.lastName || user.lastName,
          fullName: profile.fullName || user.fullName,
        });
      } catch {
        // Stale token or offline — profile link falls back to settings until next login.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialSession.token, updateUser, user?.avatarUrl, user?.firstName, user?.fullName, user?.handle, user?.id, user?.lastName]);

  const register = useCallback(async (firstName, lastName, handle, email, password) => {
    const session = normalizeAuthResponse(
      await authApi.register({ firstName, lastName, handle, email, password }),
    );
    applySession(session.user, session.token);
    return session.user;
  }, [applySession]);

  const login = useCallback(async (email, password) => {
    const session = normalizeAuthResponse(await authApi.login({ email, password }));
    applySession(session.user, session.token);
    return session.user;
  }, [applySession]);

  const logout = useCallback(() => {
    clearSession(true);
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === ROLES.ADMIN,
      isAuthReady,
      register,
      login,
      logout,
      updateUser,
    }),
    [isAuthReady, login, logout, register, updateUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
