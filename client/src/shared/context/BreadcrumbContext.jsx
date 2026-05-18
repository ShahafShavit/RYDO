import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const BreadcrumbContext = createContext(null);

export function BreadcrumbProvider({ children }) {
  const { pathname } = useLocation();
  const [detailState, setDetailState] = useState({ pathname, label: null });

  if (detailState.pathname !== pathname) {
    setDetailState({ pathname, label: null });
  }

  const detailLabel = detailState.label;

  const setDetailLabel = useCallback((value) => {
    setDetailState((prev) => ({ ...prev, label: value }));
  }, []);

  const value = useMemo(
    () => ({
      detailLabel,
      setDetailLabel,
    }),
    [detailLabel, setDetailLabel],
  );

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumbContext() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error('useBreadcrumbContext must be used within BreadcrumbProvider');
  }
  return ctx;
}

/**
 * Sets the dynamic last-segment label for detail routes (route title, ride name, etc.).
 * Clears when `title` is null/undefined/empty or on pathname change (handled by provider).
 */
export function usePageBreadcrumbDetail(title) {
  const { setDetailLabel } = useBreadcrumbContext();

  useEffect(() => {
    const s = title != null && String(title).trim() !== '' ? String(title).trim() : null;
    setDetailLabel(s);
    return () => setDetailLabel(null);
  }, [title, setDetailLabel]);
}
