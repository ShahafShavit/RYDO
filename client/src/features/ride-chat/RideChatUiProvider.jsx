import { useCallback, useMemo, useState } from 'react';
import { RideChatUiContext } from '@/features/ride-chat/ride-chat-ui-context.js';

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
