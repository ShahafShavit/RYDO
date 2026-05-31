import { Check, Link2 } from 'lucide-react';
import { QRCode } from 'react-qr-code';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel } from '@/shared/components/ui/modal/ModalPrimitives';
import TruncatedText from '@/shared/components/ui/TruncatedText';

/**
 * Bottom sheet with QR code and copy-link action for sharing SPA routes.
 */
export default function ShareSheetModal({
  open,
  onClose,
  url,
  title = 'Share',
  copied = false,
  onCopyLink,
}) {
  return (
    <AnimatedModal open={open} onClose={onClose} maxWidthClassName="max-w-sm">
      <ModalPanel className="items-center text-center">
        <ModalHeader title={title} onClose={onClose} />
        {url ? (
          <>
            <div className="mt-2 rounded-2xl bg-[var(--rydo-bg)] p-3.5 shadow-md shadow-black/25">
              <QRCode value={url} size={160} level="M" />
            </div>
            <p className="mt-4 w-full min-w-0 text-xs text-fg-muted">
              <TruncatedText>{url}</TruncatedText>
            </p>
            <button
              type="button"
              onClick={() => void onCopyLink?.()}
              className="mt-5 inline-flex w-full max-w-[240px] items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-fg/90 transition hover:border-border-strong hover:bg-surface-strong"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" aria-hidden />
              ) : (
                <Link2 className="h-4 w-4 text-fg-muted" aria-hidden />
              )}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </>
        ) : (
          <p className="mt-4 text-sm text-fg-muted">This item cannot be shared yet.</p>
        )}
      </ModalPanel>
    </AnimatedModal>
  );
}
