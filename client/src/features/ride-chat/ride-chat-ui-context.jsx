import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const RideChatUiContext = createContext(null);

export function RideChatUiProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [rideId, setRideId] = useState(null);

  const openRideChat = useCallback((id) => {
    setRideId(id != null ? String(id) : null);
    setOpen(true);
  }, []);

  const closeRideChat = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      rideChatOpen: open,
      rideChatRideId: rideId,
      openRideChat,
      closeRideChat,
      setRideChatOpen: setOpen,
    }),
    [open, rideId, openRideChat, closeRideChat],
  );

  return <RideChatUiContext.Provider value={value}>{children}</RideChatUiContext.Provider>;
}

export function useRideChatUi() {
  const ctx = useContext(RideChatUiContext);
  if (!ctx) {
    throw new Error('useRideChatUi must be used within RideChatUiProvider');
  }
  return ctx;
}
