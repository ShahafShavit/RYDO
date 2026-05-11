import { useCallback, useEffect } from 'react';
import { usePreferences } from '@/features/account/hooks/useAccount';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ThemeContext } from '@/app/providers/theme-context';
import {
  applyColorSchemeToDocument,
  COLOR_SCHEME_STORAGE_KEY,
  normalizeColorSchemeId,
} from '@/shared/theme/color-schemes';

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const { data: preferences, isSuccess } = usePreferences();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
      if (stored) {
        applyColorSchemeToDocument(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!user || !isSuccess || !preferences?.colorScheme) return;
    const id = normalizeColorSchemeId(preferences.colorScheme);
    applyColorSchemeToDocument(id);
    try {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, [user, isSuccess, preferences?.colorScheme]);

  const setColorScheme = useCallback((scheme) => {
    const id = applyColorSchemeToDocument(scheme);
    try {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    return id;
  }, []);

  return <ThemeContext.Provider value={{ setColorScheme }}>{children}</ThemeContext.Provider>;
}
