/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { ROUTES } from '@/app/router/route-paths';
import { authApi } from '@/features/auth/api/auth-api';
import { normalizeAuthResponse } from '@/features/auth/auth-mapper';
import { env } from '@/shared/config/env';
import { ROLES } from '@/shared/constants/roles';
import { getStoredUser, setStoredUser, clearStoredUser, getStoredToken, setStoredToken } from '@/features/auth/utils/auth-storage';
import { queryClient } from '@/app/query-client';
import { apiClient } from '@/shared/api/api-client';

export const AuthContext = createContext(null);

function createDevUser() {
  const role = env.devRole === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER;

  return {
    id: 999,
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

  const applySession = useCallback((nextUser, token) => {
    setUser(nextUser);
    setStoredUser(nextUser);
    setStoredToken(token);
    apiClient.setAuthToken(token);
    queryClient.invalidateQueries();
  }, []);

  const clearSession = useCallback((shouldRedirect = false) => {
    clearStoredUser();
    apiClient.setAuthToken(null);
    setUser(null);

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

  const register = useCallback(async (firstName, lastName, email, password) => {
    const session = normalizeAuthResponse(await authApi.register({ firstName, lastName, email, password }));
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
    }),
    [isAuthReady, login, logout, register, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
