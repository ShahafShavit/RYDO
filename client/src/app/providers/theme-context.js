import { createContext, useContext } from 'react';

/** @type {import('react').Context<{ setColorScheme: (scheme: string) => string } | null>} */
export const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
