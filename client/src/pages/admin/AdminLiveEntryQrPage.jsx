import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Image, Link2 } from 'lucide-react';
import { QRCode } from 'react-qr-code';
import AdminPageShell from '@/features/admin/components/AdminPageShell';
import { liveEntryApi } from '@/features/live-entry/api/live-entry-api';
import { copyQrImageFromSvg } from '@/shared/lib/copy-qr-image';
import Button from '@/shared/components/ui/button/Button';
import Card from '@/shared/components/ui/card/Card';
import Loader from '@/shared/components/feedback/Loader';

export default function AdminLiveEntryQrPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);
  const [qrFallbackDownload, setQrFallbackDownload] = useState(false);

  useEffect(() => {
    let cancelled = false;
    liveEntryApi
      .boothUrl()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not load booth URL.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const copyLink = useCallback(async () => {
    if (!data?.joinUrl) return;
    try {
      await navigator.clipboard.writeText(data.joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  }, [data]);

  const body = loading ? (
    <div className="flex justify-center py-16">
      <Loader />
    </div>
  ) : error ? (
    <p className="text-sm text-red-400">{error}</p>
  ) : (
    <LiveEntryQrCard
      data={data}
      copiedLink={copiedLink}
      copiedQr={copiedQr}
      qrFallbackDownload={qrFallbackDownload}
      onCopyLink={copyLink}
      onCopyQr={(result) => {
        if (result === 'download') {
          setQrFallbackDownload(true);
          setTimeout(() => setQrFallbackDownload(false), 3000);
          return;
        }
        setCopiedQr(true);
        setTimeout(() => setCopiedQr(false), 2000);
      }}
    />
  );

  const description = loading
    ? 'Loading booth link…'
    : error
      ? 'Generate a QR code for scan-to-join live ride demos.'
      : 'Print or display this QR at the demo booth. Each scan assigns the next demo rider and opens the live map.';

  return (
    <AdminPageShell
      title="Live entry QR"
      eyebrow="Booth"
      description={description}
      desktop={body}
      mobile={body}
    />
  );
}

function LiveEntryQrCard({ data, copiedLink, copiedQr, qrFallbackDownload, onCopyLink, onCopyQr }) {
  const qrRef = useRef(null);

  const copyQrImage = useCallback(async () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    try {
      const result = await copyQrImageFromSvg(svg);
      onCopyQr?.(result);
    } catch {
      onCopyQr?.(null);
    }
  }, [onCopyQr]);

  return (
    <Card className="mx-auto max-w-md">
      <div className="flex flex-col items-center gap-6 p-6 text-center">
        <div
          ref={qrRef}
          className="rounded-2xl bg-[var(--rydo-bg)] p-4 shadow-md shadow-black/25"
        >
          {data?.joinUrl ? <QRCode value={data.joinUrl} size={200} level="M" /> : null}
        </div>

        <p className="text-sm text-fg-muted">Stable while live entry is enabled</p>

        <div className="flex w-full max-w-xs flex-col gap-2">
          <Button type="button" variant="secondary" className="w-full gap-2" onClick={onCopyLink}>
            {copiedLink ? (
              <Check className="h-4 w-4 text-emerald-400" aria-hidden />
            ) : (
              <Link2 className="h-4 w-4" aria-hidden />
            )}
            {copiedLink ? 'Copied' : 'Copy join link'}
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
      </div>
    </Card>
  );
}
