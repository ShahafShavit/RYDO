import { useCallback, useRef, useState } from 'react';
import { Check, Image, Link2 } from 'lucide-react';
import { QRCode } from 'react-qr-code';
import { copyQrImageFromSvg } from '@/shared/lib/copy-qr-image';
import Button from '@/shared/components/ui/button/Button';
import Card from '@/shared/components/ui/card/Card';

export default function AdminQrCodeCard({
  url,
  hint,
  copyLinkLabel,
  qrFilename = 'rydo-qr.png',
  error = null,
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);
  const [qrFallbackDownload, setQrFallbackDownload] = useState(false);
  const qrRef = useRef(null);

  const copyLink = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  }, [url]);

  const copyQrImage = useCallback(async () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    try {
      const result = await copyQrImageFromSvg(svg, { filename: qrFilename });
      if (result === 'download') {
        setQrFallbackDownload(true);
        setTimeout(() => setQrFallbackDownload(false), 3000);
        return;
      }
      setCopiedQr(true);
      setTimeout(() => setCopiedQr(false), 2000);
    } catch {
      setCopiedQr(false);
    }
  }, [qrFilename]);

  return (
    <Card className="h-full">
      <div className="flex h-full flex-col items-center gap-6 p-6 text-center">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <>
            <div
              ref={qrRef}
              className="rounded-2xl bg-[var(--rydo-bg)] p-4 shadow-md shadow-black/25"
            >
              {url ? <QRCode value={url} size={200} level="M" /> : null}
            </div>

            {hint ? <p className="text-sm text-fg-muted">{hint}</p> : null}

            <div className="mt-auto flex w-full max-w-xs flex-col gap-2">
              <Button type="button" variant="secondary" className="w-full gap-2" onClick={() => void copyLink()}>
                {copiedLink ? (
                  <Check className="h-4 w-4 text-emerald-400" aria-hidden />
                ) : (
                  <Link2 className="h-4 w-4" aria-hidden />
                )}
                {copiedLink ? 'Copied' : copyLinkLabel}
              </Button>

              <Button type="button" variant="secondary" className="w-full gap-2" onClick={() => void copyQrImage()}>
                {copiedQr ? (
                  <Check className="h-4 w-4 text-emerald-400" aria-hidden />
                ) : (
                  <Image className="h-4 w-4" aria-hidden />
                )}
                {copiedQr ? 'Copied' : qrFallbackDownload ? 'Downloaded PNG' : 'Copy QR image'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
