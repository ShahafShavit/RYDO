import { Share } from '@capacitor/share';

/** @type {import('@/shared/platform/share-provider').ShareProvider} */
export const shareProvider = {
  isAvailable: () => true,
  share: async ({ title, text, url }) => {
    try {
      await Share.share({
        title,
        text,
        url,
        dialogTitle: title || 'Share',
      });
      return { ok: true };
    } catch (err) {
      if (err?.message?.includes('cancel') || err?.name === 'AbortError') {
        return { ok: false, cancelled: true };
      }
      return { ok: false };
    }
  },
};
