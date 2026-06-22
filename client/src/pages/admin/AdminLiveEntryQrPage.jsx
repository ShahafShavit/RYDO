import { useEffect, useMemo, useState } from 'react';
import { ROUTES } from '@/app/router/route-paths';
import AdminPageShell from '@/features/admin/components/AdminPageShell';
import AdminQrCodeCard from '@/features/admin/components/AdminQrCodeCard';
import { liveEntryApi } from '@/features/live-entry/api/live-entry-api';
import { buildShareUrl } from '@/shared/lib/share-url';
import Loader from '@/shared/components/feedback/Loader';

export default function AdminLiveEntryQrPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const appUrl = useMemo(() => buildShareUrl(ROUTES.getApp), []);

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

  const body = loading ? (
    <div className="flex justify-center py-16">
      <Loader />
    </div>
  ) : (
    <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
      <AdminQrCodeCard
        url={data?.joinUrl}
        hint="Stable while live entry is enabled"
        copyLinkLabel="Copy join link"
        qrFilename="rydo-live-demo-qr.png"
        error={error}
      />
      <AdminQrCodeCard
        url={appUrl}
        hint="Opens the Get the App page"
        copyLinkLabel="Copy app link"
        qrFilename="rydo-app-qr.png"
      />
    </div>
  );

  const description = loading
    ? 'Loading booth link…'
    : 'Booth join QR for live demos, plus an app install QR for the marketing download page.';

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
