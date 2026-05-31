import { useCallback, useMemo, useState } from 'react';
import { RideChatUiContext } from '@/features/ride-chat/ride-chat-ui-context.js';

export function RideChatUiProvider({ children }) {
  const [open, setOpen] = useState(false);
  /** Stays true until the chat panel exit animation finishes (tab bar sync). */
  const [panelVisible, setPanelVisible] = useState(false);
  const [rideId, setRideId] = useState(null);

  const setRideChatOpen = useCallback((next) => {
    setOpen(next);
    if (next) setPanelVisible(true);
  }, []);

  const onRideChatPanelExitComplete = useCallback(() => {
    setPanelVisible(false);
  }, []);

  const openRideChat = useCallback((id) => {
    setRideId(id != null ? String(id) : null);
    setRideChatOpen(true);
  }, [setRideChatOpen]);

  const closeRideChat = useCallback(() => {
    setRideChatOpen(false);
  }, [setRideChatOpen]);

  const value = useMemo(
    () => ({
      rideChatOpen: open,
      rideChatPanelVisible: panelVisible,
      rideChatRideId: rideId,
      openRideChat,
      closeRideChat,
      setRideChatOpen,
      onRideChatPanelExitComplete,
    }),
    [open, panelVisible, rideId, openRideChat, closeRideChat, setRideChatOpen, onRideChatPanelExitComplete],
  );

  return <RideChatUiContext.Provider value={value}>{children}</RideChatUiContext.Provider>;
}
