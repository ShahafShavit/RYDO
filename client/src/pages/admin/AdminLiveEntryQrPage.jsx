import { useCallback, useEffect, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { QRCode } from 'react-qr-code';
import AdminPageShell from '@/features/admin/components/AdminPageShell';
import { liveEntryApi } from '@/features/live-entry/api/live-entry-api';
import Button from '@/shared/components/ui/button/Button';
import Card from '@/shared/components/ui/card/Card';
import Loader from '@/shared/components/feedback/Loader';

export default function AdminLiveEntryQrPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [data]);

  if (loading) {
    return (
      <AdminPageShell title="Live entry QR" eyebrow="Booth" description="Loading booth link…">
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      </AdminPageShell>
    );
  }

  if (error) {
    return (
      <AdminPageShell title="Live entry QR" eyebrow="Booth" description="Generate a QR code for scan-to-join live ride demos.">
        <p className="text-sm text-red-400">{error}</p>
      </AdminPageShell>
    );
  }

  const validDays = data?.validDays ?? 30;
  const expiresLabel = data?.expiresAt
    ? new Date(data.expiresAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : null;

  return (
    <AdminPageShell
      title="Live entry QR"
      eyebrow="Booth"
      description="Print or display this QR at the demo booth. Each scan assigns the next demo rider and opens the live map."
    >
      <Card className="mx-auto max-w-md">
        <div className="flex flex-col items-center gap-6 p-6 text-center">
          <div className="rounded-2xl bg-[var(--rydo-bg)] p-4 shadow-md shadow-black/25">
            {data?.joinUrl ? <QRCode value={data.joinUrl} size={200} level="M" /> : null}
          </div>

          <p className="text-sm text-fg-muted">
            Valid for {validDays} days
            {expiresLabel ? ` · expires ${expiresLabel}` : ''}
          </p>

          <Button type="button" variant="secondary" className="w-full max-w-xs gap-2" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4 text-emerald-400" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
            {copied ? 'Copied' : 'Copy join link'}
          </Button>
        </div>
      </Card>
    </AdminPageShell>
  );
}
