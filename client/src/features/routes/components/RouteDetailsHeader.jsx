import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import RouteRidersPanel from '@/features/routes/components/RouteRidersPanel';
import TruncatedText from '@/shared/components/ui/TruncatedText';

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
  return '?';
}

export default function RouteDetailsHeader({ route, children }) {
  if (!route) return null;

  const cb = route.createdBy;
  const showUploader = cb?.id != null && cb?.fullName;

  return (
    <div className="relative z-(--rydo-z-route-header) min-w-0 space-y-4">
      <div>
        <h1 className="w-full min-w-0 text-3xl font-semibold">
          <TruncatedText lineClamp={2}>{route.title || 'Untitled'}</TruncatedText>
        </h1>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {showUploader ? (
              <Link
                to={ROUTES.userProfile.replace(':userId', String(cb.id))}
                className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-sm text-fg/90 transition hover:border-border-strong hover:bg-surface-strong"
              >
                {cb.avatarUrl ? (
                  <img
                    src={cb.avatarUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-strong text-xs font-semibold text-fg/80"
                    aria-hidden
                  >
                    {initialsFromName(cb.fullName)}
                  </span>
                )}
                <span className="min-w-0 truncate">
                  <span className="text-fg-subtle">Uploaded by </span>
                  <span className="font-medium text-fg/92">{cb.fullName}</span>
                </span>
              </Link>
            ) : null}
            <RouteRidersPanel variant="inline" routeId={route.id} routeRiders={route.routeRiders} />
          </div>

          {children ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{children}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
