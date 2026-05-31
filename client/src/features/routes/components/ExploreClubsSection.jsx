import { Link } from 'react-router-dom';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import ClubCardBold from '@/features/clubs/components/ClubCardBold';
import Card from '@/shared/components/ui/card/Card';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { ROUTES } from '@/app/router/route-paths';
import { cn } from '@/shared/lib/cn';

function DesktopClubCard({ club }) {
  return (
    <Link to={ROUTES.clubDetails.replace(':clubId', String(club.id))}>
      <Card className="h-full transition hover:border-rydo-purple/35">
        <div className="flex items-start gap-3">
          <UserAvatar
            avatarUrl={club.avatarUrl}
            displayName={club.name}
            sizeClass="h-10 w-10"
            textClass="text-sm"
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold text-fg">{club.name}</h3>
            {club.description ? (
              <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{club.description}</p>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function ClubList({ clubs, variant, CardComponent }) {
  if (clubs.length === 0) return null;
  const gridClass =
    variant === 'desktop' ? 'grid gap-4 md:grid-cols-2' : 'flex flex-col gap-2.5';
  return (
    <div className={gridClass}>
      {clubs.map((club) => (
        <CardComponent key={club.id} club={club} />
      ))}
    </div>
  );
}

export default function ExploreClubsSection({
  variant = 'mobile',
  memberClubs = [],
  otherPublicClubs = [],
  otherPrivateClubs = [],
  totalMatches = 0,
  searchQuery = '',
  showEmptySearch = false,
  isLoading = false,
  clubsCount = 0,
  className,
  showDiscoverEyebrow = true,
  compact = false,
}) {
  const CardComponent = variant === 'desktop' ? DesktopClubCard : ClubCardBold;
  const otherClubsCount = otherPublicClubs.length + otherPrivateClubs.length;
  const q = searchQuery.trim();

  if (isLoading) {
    return (
      <section className={cn(className)} aria-label="Clubs">
        <div
          className={cn(
            'animate-pulse rounded-[28px] bg-surface-strong',
            variant === 'desktop' ? 'h-24' : 'mx-0 h-20',
          )}
        />
      </section>
    );
  }

  if (clubsCount === 0) {
    return (
      <section className={cn(className)} aria-label="Clubs">
        <p className={variant === 'mobile' ? 'rydo-subtle text-sm' : 'text-sm text-fg-muted'}>
          No clubs yet.
        </p>
      </section>
    );
  }

  if (showEmptySearch) {
    return (
      <section className={cn(className)} aria-label="Clubs">
        {compact ? <Eyebrow className="mb-2.5">Clubs · 0</Eyebrow> : null}
        <p className={variant === 'mobile' ? 'rydo-subtle text-sm' : 'text-sm text-fg-muted'}>
          No clubs match &ldquo;{q}&rdquo;.
        </p>
      </section>
    );
  }

  const subLabelClass =
    variant === 'mobile'
      ? 'rydo-subtle mb-2 text-xs font-semibold uppercase tracking-wide'
      : 'text-sm font-medium text-fg-muted';

  return (
    <section className={cn('space-y-4', className)} aria-label="Clubs">
      {compact && q ? <Eyebrow className="mb-2.5">Clubs · {totalMatches}</Eyebrow> : null}

      <div>
        {!compact ? (
          <Eyebrow className="mb-2.5 ml-0.5">
            Your clubs · {memberClubs.length}
          </Eyebrow>
        ) : memberClubs.length > 0 ? (
          <p className={subLabelClass}>Your clubs</p>
        ) : null}
        {memberClubs.length === 0 ? (
          !compact ? (
            <p className={variant === 'mobile' ? 'rydo-subtle px-1 text-sm' : 'text-sm text-fg-subtle'}>
              {q ? 'No matching clubs in this section.' : 'You are not an active member of any club yet.'}
            </p>
          ) : null
        ) : (
          <ClubList clubs={memberClubs} variant={variant} CardComponent={CardComponent} />
        )}
      </div>

      {otherClubsCount > 0 ? (
        <div>
          {!compact && showDiscoverEyebrow ? (
            <Eyebrow className="mb-2.5 ml-0.5">Discover · {otherClubsCount}</Eyebrow>
          ) : null}
          {otherPublicClubs.length > 0 ? (
            <div className={otherPrivateClubs.length > 0 ? 'mb-4' : undefined}>
              <p className={cn(subLabelClass, variant === 'mobile' && 'px-1')}>
                Public — open to join
              </p>
              <ClubList clubs={otherPublicClubs} variant={variant} CardComponent={CardComponent} />
            </div>
          ) : null}
          {otherPrivateClubs.length > 0 ? (
            <div>
              <p className={cn(subLabelClass, variant === 'mobile' && 'px-1')}>
                Private — invite or approval
              </p>
              <ClubList clubs={otherPrivateClubs} variant={variant} CardComponent={CardComponent} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
