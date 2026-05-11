/* eslint-disable react-refresh/only-export-components -- context + hook belong together */
import { createContext, useContext, useMemo, useState } from 'react';

const ClubChatUiContext = createContext(null);

export function ClubChatUiProvider({ children }) {
  const [open, setOpen] = useState(false);

  const value = useMemo(
    () => ({
      chatOpen: open,
      setChatOpen: setOpen,
      openChat: () => setOpen(true),
      closeChat: () => setOpen(false),
      toggleChat: () => setOpen((o) => !o),
    }),
    [open],
  );

  return <ClubChatUiContext.Provider value={value}>{children}</ClubChatUiContext.Provider>;
}

export function useClubChatUi() {
  const ctx = useContext(ClubChatUiContext);
  if (!ctx) {
    throw new Error('useClubChatUi must be used within ClubChatUiProvider');
  }
  return ctx;
}
