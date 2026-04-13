import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import Card from '@/shared/components/ui/card/Card';
import Badge from '@/shared/components/ui/badge/Badge';
import Button from '@/shared/components/ui/button/Button';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { ROUTES } from '@/app/router/route-paths';
import { isRideUpcoming } from '@/features/rides/hooks/useRideEvent';
import { formatRideDateTime } from '@/features/rides/utils/formatRideDateTime';

const badgeLinkClass =
  'inline-flex min-w-0 max-w-full rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple';

/**
 * @param {{ ride: object, showEdit?: boolean, onEditClick?: () => void }} props
 */
export default function RideEventCard({ ride, showEdit = false, onEditClick }) {
  const upcoming = isRideUpcoming(ride);
  const routeBadge = (
    <Badge variant="route" className="max-w-full min-w-0 truncate">
      {ride.routeName}
    </Badge>
  );
  const clubBadge =
    ride.clubName != null && String(ride.clubName).trim() !== '' ? (
      <Badge variant="success" className="max-w-full min-w-0 truncate">
        {ride.clubName}
      </Badge>
    ) : null;

  const whenLabel = formatRideDateTime(ride.scheduledDate || ride.time);
  const notes = String(ride.notes || '').trim();

  return (
    <Card className="p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Badge variant="neon">{upcoming ? 'Upcoming' : 'Past'}</Badge>
          {ride.clubId == null && ride.rideKind !== 'soloLog' ? (
            <Badge variant="personal">Personal</Badge>
          ) : null}
          {ride.routeId != null ? (
            <Link to={ROUTES.routeDetails.replace(':routeId', String(ride.routeId))} className={badgeLinkClass}>
              {routeBadge}
            </Link>
          ) : (
            routeBadge
          )}
          {ride.clubName && ride.clubId != null ? (
            <Link to={ROUTES.clubDetails.replace(':clubId', String(ride.clubId))} className={badgeLinkClass}>
              {clubBadge}
            </Link>
          ) : (
            clubBadge
          )}
        </div>
        {showEdit ? (
          <Button variant="secondary" type="button" className="shrink-0" onClick={onEditClick}>
            Edit ride
          </Button>
        ) : null}
      </div>

      <div className="mt-6 space-y-5">
        <div className="space-y-4">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{ride.name}</h1>

          {ride.createdBy?.fullName ? (
            ride.createdBy?.id != null ? (
              <Link
                to={ROUTES.userProfile.replace(':userId', String(ride.createdBy.id))}
                className="inline-flex max-w-full min-w-0 items-center gap-2.5 rounded-full border border-border bg-surface py-1.5 pl-1.5 pr-4 text-sm text-fg transition hover:border-border-strong hover:bg-surface-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple"
              >
                <UserAvatar
                  avatarUrl={ride.createdBy.avatarUrl}
                  displayName={ride.createdBy.fullName}
                  sizeClass="h-9 w-9"
                  textClass="text-xs"
                />
                <span className="min-w-0 truncate text-left">
                  <span className="text-fg-subtle">Organized by </span>
                  <span className="font-medium text-fg">{ride.createdBy.fullName}</span>
                </span>
              </Link>
            ) : (
              <div className="inline-flex max-w-full min-w-0 items-center gap-2.5 rounded-full border border-border bg-surface py-1.5 pl-1.5 pr-4 text-sm">
                <UserAvatar
                  avatarUrl={ride.createdBy.avatarUrl}
                  displayName={ride.createdBy.fullName}
                  sizeClass="h-9 w-9"
                  textClass="text-xs"
                />
                <span className="min-w-0 truncate text-left text-fg-subtle">
                  Organized by{' '}
                  <span className="font-medium text-fg">{ride.createdBy.fullName}</span>
                </span>
              </div>
            )
          ) : null}
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface-strong/40 px-4 py-3.5 backdrop-blur-sm">
          <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-fg-subtle" strokeWidth={2} aria-hidden />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">When</p>
            <p className="mt-1 text-base font-semibold tabular-nums text-fg">{whenLabel}</p>
          </div>
        </div>

        {notes ? (
          <div className="rounded-2xl border border-border bg-surface px-4 py-4 sm:px-5 sm:py-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">Details</p>
            <p className="mt-2.5 text-sm leading-relaxed text-fg-muted">{notes}</p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
