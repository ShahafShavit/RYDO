import { Link } from 'react-router-dom';
import { ChevronRight, MapPin } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import { getClubListMembershipStatus } from '@/features/clubs/club-list-membership-utils';
import ClubListMembershipBadge from '@/features/clubs/components/ClubListMembershipBadge';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { cn } from '@/shared/lib/cn';

function visibilityPillClass(visibility) {
  return String(visibility).toLowerCase() === 'public' ? 'rydo-pill-green' : '';
}

export default function ClubCardBold({ club, className }) {
  const membershipStatus = getClubListMembershipStatus(club);
  const href = ROUTES.clubDetails.replace(':clubId', String(club.id));

  return (
    <Link
      to={href}
      className={cn(
        'rydo-bold-glass-row flex items-center gap-3 p-3 transition hover:border-border-strong',
        className,
      )}
    >
      <UserAvatar
        avatarUrl={club.avatarUrl}
        displayName={club.name}
        sizeClass="h-12 w-12"
        textClass="text-sm"
        className="shrink-0 ring-2 ring-border"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'rydo-pill px-2 py-0.5 text-[10px] font-bold capitalize',
              visibilityPillClass(club.visibility),
            )}
          >
            {club.visibility || 'club'}
          </span>
          {membershipStatus ? <ClubListMembershipBadge status={membershipStatus} /> : null}
        </div>
        <DisplayTitle as="div" size="sm" className="mt-1.5 truncate text-lg">
          {club.name}
        </DisplayTitle>
        {club.region ? (
          <span className="rydo-subtle mt-0.5 inline-flex items-center gap-1 text-xs">
            <MapPin className="h-3 w-3" aria-hidden />
            {club.region}
          </span>
        ) : null}
        {club.description ? (
          <p className="rydo-subtle mt-1.5 line-clamp-2 text-xs leading-snug">{club.description}</p>
        ) : null}
      </div>
      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
    </Link>
  );
}
