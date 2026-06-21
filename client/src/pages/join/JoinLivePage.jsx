import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { liveEntryApi } from '@/features/live-entry/api/live-entry-api';
import { normalizeAuthResponse } from '@/features/auth/auth-mapper';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { clearStoredUser } from '@/features/auth/utils/auth-storage';
import { apiClient } from '@/shared/api/api-client';
import Button from '@/shared/components/ui/button/Button';
import Card from '@/shared/components/ui/card/Card';
import Loader from '@/shared/components/feedback/Loader';

function formatScheduled(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function displayInitial(firstName, lastName) {
  const f = String(firstName || '').trim();
  const l = String(lastName || '').trim();
  if (f && l) return `${f} ${l.charAt(0).toUpperCase()}.`;
  return f || l || 'Rider';
}

export default function JoinLivePage() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const isDemoMode = pathname === ROUTES.joinDemo;
  const boothToken = isDemoMode ? '' : searchParams.get('g')?.trim() || '';
  const navigate = useNavigate();
  const { loginWithSession } = useAuth();

  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!isDemoMode && !boothToken) {
      setPreviewLoading(false);
      setPreviewError('Missing booth link. Scan the QR code from the event desk.');
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);

    liveEntryApi
      .preview(boothToken || undefined)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setPreviewError(err?.message || 'Could not load ride preview.');
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [boothToken, isDemoMode]);

  const canJoin = Boolean(preview && (isDemoMode || boothToken) && !previewLoading && !previewError);

  const handleJoin = useCallback(async () => {
    if ((!isDemoMode && !boothToken) || joining) return;
    setJoinError(null);
    setJoining(true);

    try {
      clearStoredUser();
      apiClient.setAuthToken(null);

      const challenge = await liveEntryApi.challenge(boothToken || undefined);
      const entryToken = challenge?.entryToken;
      if (!entryToken) throw new Error('Could not start live entry.');

      const redeem = await liveEntryApi.redeem(entryToken);
      const session = normalizeAuthResponse(redeem);
      if (!session.token || !session.user) throw new Error('Could not sign in for live ride.');

      loginWithSession(session.user, session.token);

      const label = displayInitial(redeem.user?.firstName, redeem.user?.lastName);
      setToast(`Joined as ${label}`);

      const rideId = redeem.rideId ?? preview?.rideId;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (rideId != null) {
        navigate(ROUTES.rideLive.replace(':rideId', String(rideId)), { replace: true });
      } else {
        navigate(ROUTES.dashboard, { replace: true });
      }
    } catch (err) {
      setJoinError(err?.message || 'Could not join live ride.');
      setJoining(false);
    }
  }, [boothToken, isDemoMode, joining, loginWithSession, navigate, preview?.rideId]);

  const pageTitle = useMemo(() => (previewLoading ? 'Loading…' : 'Join live ride'), [previewLoading]);

  if (previewLoading) {
    return (
      <section className="rydo-container flex min-h-[50vh] items-center justify-center py-16">
        <Loader />
      </section>
    );
  }

  return (
    <section className="rydo-container py-16">
      <Card className="relative mx-auto w-full max-w-md">
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-2xl font-semibold">{pageTitle}</h1>
            <p className="mt-1 text-sm text-fg-muted">Scan-to-join demo for the live ride map.</p>
          </div>

          {previewError ? (
            <p className="text-sm text-red-400" role="alert">
              {previewError}
            </p>
          ) : preview ? (
            <dl className="space-y-3 rounded-2xl border border-border bg-surface-strong/60 p-4 text-sm">
              <div>
                <dt className="text-fg-muted">Ride</dt>
                <dd className="font-medium text-fg">{preview.rideName}</dd>
              </div>
              <div>
                <dt className="text-fg-muted">Route</dt>
                <dd className="font-medium text-fg">{preview.routeTitle}</dd>
              </div>
              <div>
                <dt className="text-fg-muted">Scheduled</dt>
                <dd className="font-medium text-fg">{formatScheduled(preview.scheduledDate)}</dd>
              </div>
            </dl>
          ) : null}

          {joinError ? (
            <p className="text-sm text-red-400" role="alert">
              {joinError}
            </p>
          ) : null}

          <Button
            type="button"
            variant="neon"
            className="w-full"
            disabled={!canJoin || joining || Boolean(toast)}
            onClick={handleJoin}
          >
            {joining ? 'Joining…' : 'Join live ride'}
          </Button>
        </div>

        {toast ? (
          <div
            className="absolute inset-x-4 bottom-4 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-center text-sm font-medium text-emerald-100"
            role="status"
          >
            {toast}
          </div>
        ) : null}
      </Card>
    </section>
  );
}
