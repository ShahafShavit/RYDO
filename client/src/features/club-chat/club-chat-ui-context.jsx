/* eslint-disable react-refresh/only-export-components -- context + hook belong together */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ClubChatUiContext = createContext(null);

export function ClubChatUiProvider({ children }) {
  const [open, setOpen] = useState(false);
  /** Stays true until the chat panel exit animation finishes (tab bar sync). */
  const [panelVisible, setPanelVisible] = useState(false);

  const setChatOpen = useCallback((next) => {
    setOpen(next);
    if (next) setPanelVisible(true);
  }, []);

  const onChatPanelExitComplete = useCallback(() => {
    setPanelVisible(false);
  }, []);

  const value = useMemo(
    () => ({
      chatOpen: open,
      chatPanelVisible: panelVisible,
      setChatOpen,
      onChatPanelExitComplete,
      openChat: () => setChatOpen(true),
      closeChat: () => setChatOpen(false),
      toggleChat: () => {
        setOpen((prev) => {
          const next = !prev;
          if (next) setPanelVisible(true);
          return next;
        });
      },
    }),
    [open, panelVisible, setChatOpen, onChatPanelExitComplete],
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
