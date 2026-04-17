import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { ROUTES } from '@/app/router/route-paths';
import { isRideUpcoming } from '@/features/rides/hooks/useRideEvent';
import { formatRideDateTime } from '@/features/rides/utils/formatRideDateTime';

/**
 * @param {{ ride: object, showEdit?: boolean, onEditClick?: () => void, headerExtra?: import('react').ReactNode }} props
 */
export default function RideEventCard({ ride, showEdit = false, onEditClick, headerExtra = null }) {
  const upcoming = isRideUpcoming(ride);
  const whenLabel = formatRideDateTime(ride.scheduledDate || ride.time);
  const notes = String(ride.notes || '').trim();
  const hasClub = ride.clubId != null && ride.clubName != null && String(ride.clubName).trim() !== '';
  const organizer = ride.createdBy;
  const hasOrganizer = organizer?.fullName;

  const showTitleActions = showEdit || headerExtra;

  return (
    <Card className="p-5 sm:p-8">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <h1 className="min-w-0 flex-1 text-balance text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            {ride.name}
          </h1>
          {showTitleActions ? (
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              {headerExtra}
              {showEdit ? (
                <Button variant="secondary" type="button" className="shrink-0" onClick={onEditClick}>
                  Edit ride
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {hasOrganizer ? (
          <div className="flex flex-wrap items-start gap-3 sm:gap-4">
            <div className="flex shrink-0 items-center gap-2">
              {organizer?.id != null ? (
                <Link
                  to={ROUTES.userProfile.replace(':userId', String(organizer.id))}
                  className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple"
                >
                  <UserAvatar
                    avatarUrl={organizer.avatarUrl}
                    displayName={organizer.fullName}
                    sizeClass="h-11 w-11"
                    textClass="text-xs"
                  />
                </Link>
              ) : (
                <UserAvatar
                  avatarUrl={organizer.avatarUrl}
                  displayName={organizer.fullName}
                  sizeClass="h-11 w-11"
                  textClass="text-xs"
                />
              )}
              {hasClub ? (
                <Link
                  to={ROUTES.clubDetails.replace(':clubId', String(ride.clubId))}
                  className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple"
                >
                  <UserAvatar
                    avatarUrl={ride.clubAvatarUrl}
                    displayName={ride.clubName}
                    sizeClass="h-11 w-11"
                    textClass="text-xs"
                  />
                </Link>
              ) : null}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm leading-snug text-fg">
                <span className="text-fg-subtle">Organized by </span>
                {organizer?.id != null ? (
                  <Link
                    to={ROUTES.userProfile.replace(':userId', String(organizer.id))}
                    className="font-medium text-fg underline-offset-2 hover:text-rydo-purple hover:underline"
                  >
                    {organizer.fullName}
                  </Link>
                ) : (
                  <span className="font-medium text-fg">{organizer.fullName}</span>
                )}
              </p>
              {hasClub ? (
                <p className="text-sm leading-snug text-fg">
                  <span className="text-fg-subtle">for </span>
                  <Link
                    to={ROUTES.clubDetails.replace(':clubId', String(ride.clubId))}
                    className="font-medium text-fg underline-offset-2 hover:text-rydo-purple hover:underline"
                  >
                    {ride.clubName}
                  </Link>
                </p>
              ) : ride.clubId == null && ride.rideKind !== 'soloLog' ? (
                <p className="text-sm text-fg-muted">Personal ride</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          className={`grid gap-4 ${notes ? 'sm:grid-cols-2' : ''}`}
        >
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface-strong/40 px-4 py-3.5 backdrop-blur-sm">
            <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-fg-subtle" strokeWidth={2} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">When</p>
                {upcoming ? (
                  <span className="rounded-md border border-amber-400/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100">
                    Upcoming
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-base font-semibold tabular-nums text-fg">{whenLabel}</p>
            </div>
          </div>

          {notes ? (
            <div className="rounded-2xl border border-border bg-surface px-4 py-3.5 sm:px-5 sm:py-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">Details</p>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{notes}</p>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
