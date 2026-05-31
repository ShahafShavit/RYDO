import { useContext } from 'react';
import { RideChatUiContext } from '@/features/ride-chat/ride-chat-ui-context.js';

export function useRideChatUi() {
  const ctx = useContext(RideChatUiContext);
  if (!ctx) {
    throw new Error('useRideChatUi must be used within RideChatUiProvider');
  }
  return ctx;
}
