import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import RouteRidersRosterModal, { RouteRiderRow } from '@/features/routes/components/RouteRidersRosterModal';

const PREVIEW_LIMIT = 5;

export default function RouteRidersPanel({ routeRiders, variant = 'card' }) {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const wrapRef = useRef(null);
  const total = routeRiders?.totalCount ?? 0;
  const visible = Array.isArray(routeRiders?.visibleRiders) ? routeRiders.visibleRiders : [];
  const hiddenCount = Math.max(0, total - visible.length);
  const preview = visible.slice(0, PREVIEW_LIMIT);
  const hasMore = visible.length > PREVIEW_LIMIT;

  useEffect(() => {
    if (!open || variant !== 'inline') return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, variant]);

  if (total <= 0) return null;

  const label =
    total === 1 ? '1 person rode this route!' : `${total} people rode this route!`;

  const hiddenNote = (
    <p className="text-sm leading-snug text-white/45">
      +{hiddenCount}{' '}
      {hiddenCount === 1 ? 'rider has' : 'riders have'} hidden their name in Settings → Preferences.
    </p>
  );

  const fullList = (
    <ul className="space-y-0.5">
      {visible.length > 0 ? (
        visible.map((r) => (
          <li key={r.userId}>
            <Link
              to={ROUTES.userProfile.replace(':userId', String(r.userId))}
              className="text-[#7B5CFF] hover:underline"
            >
              {r.fullName}
            </Link>
          </li>
        ))
      ) : (
        <li className="text-sm text-white/50">No riders opted to show their name on this list.</li>
      )}
      {hiddenCount > 0 ? <li className="pt-1">{hiddenNote}</li> : null}
    </ul>
  );

  if (variant === 'inline') {
    return (
      <>
        <div className="relative" ref={wrapRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-left text-sm text-white/88 transition hover:border-white/20 hover:bg-white/[0.09]"
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <span className="truncate font-medium">{label}</span>
            <span className="shrink-0 text-xs text-white/45">{open ? '▴' : '▾'}</span>
          </button>
          {open ? (
            <div className="absolute left-0 top-[calc(100%+0.375rem)] z-[10060] w-[min(100vw-2rem,20rem)] rounded-xl border border-white/12 bg-[#141418] p-3 shadow-xl">
              {visible.length === 0 ? (
                <p className="text-sm text-white/50">No riders opted to show their name on this list.</p>
              ) : (
                <>
                  <ul className="space-y-0.5 pr-0.5">
                    {preview.map((r) => (
                      <RouteRiderRow
                        key={r.userId}
                        userId={r.userId}
                        fullName={r.fullName}
                        avatarUrl={r.avatarUrl}
                      />
                    ))}
                  </ul>
                  {hiddenCount > 0 ? <div className="mt-2 border-t border-white/8 pt-2 text-xs">{hiddenNote}</div> : null}
                  {hasMore ? (
                    <button
                      type="button"
                      className="mt-3 w-full rounded-xl border border-[#7B5CFF]/35 bg-[#7B5CFF]/10 py-2 text-sm font-medium text-[#c4b5fd] transition hover:bg-[#7B5CFF]/20"
                      onClick={() => {
                        setOpen(false);
                        setModalOpen(true);
                      }}
                    >
                      Show more
                    </button>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
        <RouteRidersRosterModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          riders={visible}
          hiddenCount={hiddenCount}
        />
      </>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left text-base font-medium text-white/92"
        aria-expanded={open}
      >
        <span>{label}</span>
        <span className="text-sm text-white/45">{open ? 'Hide' : 'Who?'}</span>
      </button>
      {open ? <div className="mt-4 border-t border-white/8 pt-4">{fullList}</div> : null}
    </div>
  );
}
