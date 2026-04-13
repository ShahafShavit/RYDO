import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ROUTES } from '@/app/router/route-paths';

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
  return '?';
}

export function RouteRiderRow({ userId, fullName, avatarUrl }) {
  return (
    <li>
      <Link
        to={ROUTES.userProfile.replace(':userId', String(userId))}
        className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" loading="lazy" />
        ) : (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-strong text-xs font-semibold text-fg/80"
            aria-hidden
          >
            {initialsFromName(fullName)}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate font-medium text-fg/90">{fullName}</span>
      </Link>
    </li>
  );
}

/** Mounted only while the roster modal is open — search state resets each time it opens. */
function RouteRidersRosterModalContent({ onClose, riders, hiddenCount }) {
  const titleId = useId();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return riders;
    return riders.filter((r) => r.fullName.toLowerCase().includes(t));
  }, [riders, q]);

  return (
    <Card
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="max-h-[min(90vh,640px)] w-full overflow-hidden border border-border bg-[var(--rydo-bg-deep)]/95 shadow-2xl shadow-black/40"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 id={titleId} className="text-xl font-semibold">
            Who rode this route
          </h2>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-fg-muted transition hover:bg-surface-strong hover:text-fg"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="pt-4">
        <label className="sr-only" htmlFor="route-riders-search">
          Search riders by name
        </label>
        <input
          id="route-riders-search"
          type="search"
          autoComplete="off"
          placeholder="Search by name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-rydo-purple/50 focus:outline-none focus:ring-1 focus:ring-rydo-purple/40"
        />

        <ul className="mt-3 max-h-[min(50vh,22rem)] space-y-0.5 overflow-y-auto overscroll-contain pr-1">
          {filtered.length > 0 ? (
            filtered.map((r) => (
              <RouteRiderRow
                key={r.userId}
                userId={r.userId}
                fullName={r.fullName}
                avatarUrl={r.avatarUrl}
              />
            ))
          ) : (
            <li className="py-8 text-center text-sm text-fg-subtle">No names match your search.</li>
          )}
        </ul>

        {hiddenCount > 0 ? (
          <p className="mt-3 border-t border-border pt-3 text-sm leading-snug text-fg-subtle">
            +{hiddenCount}{' '}
            {hiddenCount === 1 ? 'rider has' : 'riders have'} hidden their name in Settings → Preferences.
          </p>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-border bg-surface py-2.5 text-sm font-medium text-fg/90 transition hover:bg-surface-strong"
        >
          Close
        </button>
      </div>
    </Card>
  );
}

export default function RouteRidersRosterModal({ open, onClose, riders, hiddenCount }) {
  return (
    <AnimatedModal open={open} onClose={onClose} zIndexClass="z-(--rydo-z-modal-nested)" maxWidthClassName="max-w-md">
      {open ? (
        <RouteRidersRosterModalContent onClose={onClose} riders={riders} hiddenCount={hiddenCount} />
      ) : null}
    </AnimatedModal>
  );
}
