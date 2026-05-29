import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import CompactRouteMapPreview from '@/features/routes/components/CompactRouteMapPreview';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import { formatDurationMinutes } from '@/features/dashboard/dashboard-mapper';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import { resolveRideMapPreview } from '@/features/rides/hooks/useRideEvent';
import { cn } from '@/shared/lib/cn';

function formatWhen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

function statusPill(variant) {
  if (variant === 'upcoming') return { className: 'rydo-pill-green', label: 'Scheduled' };
  if (variant === 'past') return { className: 'rydo-pill', label: 'Past event' };
  return { className: 'rydo-pill-accent', label: 'Logged' };
}

export default function RideListCardBold({
  variant = 'upcoming',
  ride,
  entry,
  className,
}) {
  const { formatKm, formatElevation } = useFormatDistance();
  const isHistory = variant === 'history' && entry;
  const data = isHistory ? entry : ride;
  if (!data) return null;

  const rideId = isHistory ? entry.rideId : ride.id;
  const ridePath = rideId != null ? ROUTES.rideEvent.replace(':rideId', String(rideId)) : null;
  const title =
    isHistory
      ? entry.routeTitle || entry.routeName || (entry.routeId != null ? `Route #${entry.routeId}` : 'Ride')
      : ride.name;
  const when = isHistory ? entry.completedAt : ride.scheduledDate;
  const preview = isHistory ? entry.preview : resolveRideMapPreview(ride);
  const clubName = isHistory ? entry.clubName : ride.clubName;
  const clubId = isHistory ? entry.clubId : ride.clubId;
  const isClub = clubId != null;
  const isPersonal = !isClub && (isHistory
    ? entry.rideKind === 'soloLog' || entry.rideKind === 'personal'
    : true);

  const dist =
    isHistory && entry.distanceKm != null ? formatKm(Number(entry.distanceKm)) : null;
  const elev =
    isHistory && entry.elevationGainM != null
      ? formatElevation(Number(entry.elevationGainM), 0)
      : null;
  const duration = isHistory ? formatDurationMinutes(entry.durationMinutes) : null;

  const pill = statusPill(variant);

  const inner = (
    <>
      <div className="w-24 min-h-16 shrink-0 self-stretch overflow-hidden rounded-2xl border border-border">
        <CompactRouteMapPreview
          preview={preview}
          compactPlaceholder
          className="h-full w-full overflow-hidden rounded-none border-0 bg-surface"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('rydo-pill px-2.5 py-0.5 text-[11px] font-bold', pill.className)}>
            {pill.label}
          </span>
          {isClub ? (
            <span className="rydo-pill rydo-pill-green px-2 py-0.5 text-[10px] font-semibold">
              {clubName || 'Club'}
            </span>
          ) : isPersonal ? (
            <span className="rydo-pill px-2 py-0.5 text-[10px] font-semibold">Personal</span>
          ) : null}
        </div>
        <DisplayTitle as="div" size="sm" className="mt-1.5 truncate text-lg">
          {title}
        </DisplayTitle>
        <Eyebrow className="mt-1 text-[10px]">{formatWhen(when)}</Eyebrow>
        {isHistory && (dist || duration || elev) ? (
          <div className="mt-auto flex flex-wrap gap-3 pt-2">
            {dist ? (
              <span className="rydo-tnum text-[13px] font-bold text-fg">{dist}</span>
            ) : null}
            {duration ? (
              <span className="rydo-tnum text-[13px] font-bold text-fg">{duration}</span>
            ) : null}
            {elev ? (
              <span className="rydo-tnum text-[13px] font-bold text-fg">{elev}</span>
            ) : null}
          </div>
        ) : null}
        {variant === 'past' && !isHistory ? (
          <p className="rydo-subtle mt-1 text-[11px]">No logged stats yet</p>
        ) : null}
      </div>
      {ridePath ? (
        <ChevronRight className="my-auto h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
      ) : null}
    </>
  );

  if (!ridePath) {
    return (
      <div className={cn('rydo-bold-glass-row flex items-stretch gap-3 p-2.5', className)}>
        {inner}
      </div>
    );
  }

  return (
    <Link
      to={ridePath}
      className={cn(
        'rydo-bold-glass-row flex items-stretch gap-3 p-2.5 transition hover:border-border-strong no-underline',
        className,
      )}
    >
      {inner}
    </Link>
  );
}
