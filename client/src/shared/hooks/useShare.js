import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { QRCode } from 'react-qr-code';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { buildShareUrl } from '@/shared/lib/share-url';
import { copyToClipboard, platformShare } from '@/shared/platform/share-provider';
import ShareSheetModal from '@/shared/components/share/ShareSheetModal';

/**
 * Share hook: opens QR modal, copies link, and invokes native share sheet.
 * @param {{ path?: string | null, url?: string | null, title?: string, text?: string }} options
 */
export function useShare({ path, url: urlProp, title = 'RYDO', text }) {
  const { isOpen, open, close } = useDisclosure(false);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef(null);

  const url = useMemo(() => {
    if (urlProp) return urlProp;
    return buildShareUrl(path);
  }, [path, urlProp]);

  const shareText = text ?? (title ? `Check out ${title} on RYDO` : 'Check out RYDO');

  useEffect(
    () => () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    },
    [],
  );

  const markCopied = useCallback(() => {
    setCopied(true);
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
  }, []);

  const copyLink = useCallback(async () => {
    if (!url) return false;
    const ok = await copyToClipboard(url);
    if (ok) markCopied();
    return ok;
  }, [url, markCopied]);

  const share = useCallback(() => {
    if (!url) return;
    open();
    void copyLink();
    void platformShare({ title, text: shareText, url });
  }, [url, open, copyLink, title, shareText]);

  const copyAndShare = useCallback(() => {
    if (!url) return;
    void copyLink();
    void platformShare({ title, text: shareText, url });
  }, [url, copyLink, title, shareText]);

  const modalProps = {
    open: isOpen,
    onClose: close,
    url,
    title,
    copied,
    onCopyLink: copyLink,
  };

  return {
    share,
    copyLink,
    copyAndShare,
    url,
    copied,
    modalProps,
    ShareModal: ShareSheetModal,
  };
}
