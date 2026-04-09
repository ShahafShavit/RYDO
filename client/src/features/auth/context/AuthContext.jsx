import { createContext, useEffect, useMemo, useState } from 'react';
import { env } from '@/shared/config/env';
import { ROLES } from '@/shared/constants/roles';
import { getStoredUser, setStoredUser, clearStoredUser, getStoredToken, setStoredToken } from '@/features/auth/utils/auth-storage';
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
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const savedUser = getStoredUser();
    const token = getStoredToken();

    if (token) apiClient.setAuthToken(token);

    if (savedUser) {
      setUser(savedUser);
      setIsAuthReady(true);
      return;
    }

    if (env.devAuthEnabled) {
      const devUser = createDevUser();
      setUser(devUser);
      setStoredUser(devUser);
      // dev mode doesn't use token
    }

    setIsAuthReady(true);
  }, []);

  async function register(fullName, email, password) {
    const res = await apiClient.post('/auth/register', { fullName, email, password });
    const userData = {
      id: res.userId,
      fullName: res.fullName,
      email: res.email,
      role: res.role,
    };
    setUser(userData);
    setStoredUser(userData);
    setStoredToken(res.token);
    apiClient.setAuthToken(res.token);
    return userData;
  }

  async function login(email, password) {
    const res = await apiClient.post('/auth/login', { email, password });
    const userData = {
      id: res.userId,
      fullName: res.fullName,
      email: res.email,
      role: res.role,
    };
    setUser(userData);
    setStoredUser(userData);
    setStoredToken(res.token);
    apiClient.setAuthToken(res.token);
    return userData;
  }

  function logout() {
    clearStoredUser();
    apiClient.setAuthToken(null);
    setUser(null);
    window.location.href = '/login';
  }

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
    [user, isAuthReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
