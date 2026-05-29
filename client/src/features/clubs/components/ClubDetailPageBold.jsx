import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, SlidersHorizontal } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import ClubMemberChip from '@/features/clubs/components/ClubMemberChip';
import RideListCardBold from '@/features/rides/components/RideListCardBold';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import GradientCTA from '@/shared/components/bold/GradientCTA';
import IconButton from '@/shared/components/bold/IconButton';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { cn } from '@/shared/lib/cn';

function visibilityPillClass(visibility) {
  return String(visibility).toLowerCase() === 'public' ? 'rydo-pill-green' : '';
}

function ridePeopleSummary(r) {
  const fromDetails = Array.isArray(r.participantDetails) ? r.participantDetails.length : 0;
  const fromParts = Array.isArray(r.participants) ? r.participants.length : 0;
  let count = 0;
  if (r.participantCount != null && r.participantCount !== '') {
    const n = Number(r.participantCount);
    if (Number.isFinite(n)) count = n;
  }
  if (count === 0) count = fromDetails || fromParts || 0;
  if (Array.isArray(r.participantDetails) && r.participantDetails.length > 0) {
    const names = r.participantDetails
      .map((p) => p.displayName?.trim() || `Rider #${p.userId}`)
      .slice(0, 3)
      .join(', ');
    const extra = r.participantDetails.length > 3 ? ` +${r.participantDetails.length - 3}` : '';
    return `${names}${extra}`;
  }
  return `${count} signed up`;
}

export default function ClubDetailPageBold({
  club,
  user,
  isLoading,
  isError,
  canSeeMembers,
  sortedMembers = [],
  membersLoading,
  ridesLoading,
  rideSummary,
  upcomingRides = [],
  pastRides = [],
  inviteToken,
  onInviteTokenChange,
  inviteRedeemOpen,
  onToggleInviteRedeem,
  onJoin,
  joinPending,
  onLeave,
  leavePending,
  onRedeemInvite,
  redeemPending,
  redeemError,
  onScheduleOpen,
  onSettingsOpen,
  approveMut,
  rejectMut,
  promoteMut,
  demoteMut,
  removeMut,
}) {
  const navigate = useNavigate();
  const isAdmin = club?.currentUserMembership === 'admin';
  const isMember = club?.currentUserMembership === 'member' || isAdmin;
  const isPending = club?.currentUserMembership === 'pending';
  const canJoin =
    user &&
    (club?.currentUserMembership === 'none' || club?.currentUserMembership == null);
  const showInviteRedeem =
    inviteRedeemOpen &&
    !isAdmin &&
    club?.visibility === 'private' &&
    user &&
    (canJoin || isPending);

  if (isLoading && !club) {
    return (
      <BoldScreen>
        <div className="mx-5 mt-6 h-8 w-48 animate-pulse rounded-lg bg-surface-strong" />
        <div className="mx-5 mt-6 h-32 animate-pulse rounded-[28px] bg-surface-strong" />
      </BoldScreen>
    );
  }

  if (isError || !club) {
    return (
      <BoldScreen>
        <div className="px-5 pt-4">
          <IconButton icon={ArrowLeft} aria-label="Back to clubs" onClick={() => navigate(ROUTES.clubs)} />
          <p className="mt-4 text-sm text-red-400">Could not load this club.</p>
        </div>
      </BoldScreen>
    );
  }

  return (
    <BoldScreen className="min-h-[100dvh] md:min-h-0">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 pb-1 pt-1">
          <IconButton icon={ArrowLeft} size="lg" aria-label="Back to clubs" onClick={() => navigate(ROUTES.clubs)} />
          <div className="flex-1" />
          {isAdmin ? (
            <IconButton
              icon={SlidersHorizontal}
              size="lg"
              aria-label="Club settings"
              onClick={onSettingsOpen}
            />
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4 pt-1">
          <div className="flex items-start gap-3.5">
            <UserAvatar
              avatarUrl={club.avatarUrl}
              displayName={club.name}
              sizeClass="h-[68px] w-[68px]"
              textClass="text-2xl"
              className="shrink-0 ring-2 ring-rydo-purple/55 shadow-[0_0_30px_rgba(123,92,255,0.25)]"
            />
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'rydo-pill px-2.5 py-0.5 text-[11px] font-bold capitalize',
                    visibilityPillClass(club.visibility),
                  )}
                >
                  {club.visibility}
                </span>
                {isAdmin ? (
                  <span className="rydo-pill rydo-pill-green px-2.5 py-0.5 text-[11px] font-bold">Admin</span>
                ) : null}
                {isPending ? (
                  <span className="rydo-pill rydo-pill-amber px-2.5 py-0.5 text-[11px] font-bold">Pending</span>
                ) : null}
              </div>
              <DisplayTitle size="sm" className="mt-2">
                {club.name}
              </DisplayTitle>
              {club.region ? (
                <span className="rydo-subtle mt-1.5 inline-flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {club.region}
                </span>
              ) : null}
            </div>
          </div>

          {club.description ? (
            <p className="rydo-subtle text-sm leading-relaxed">{club.description}</p>
          ) : null}

          {!isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              {canJoin ? (
                <GradientCTA
                  type="button"
                  heightClass="h-11"
                  className="px-5 text-sm"
                  onClick={onJoin}
                  disabled={joinPending}
                >
                  {club.visibility === 'private' ? 'Request to join' : 'Join club'}
                </GradientCTA>
              ) : null}
              {club.visibility === 'private' && user && (canJoin || isPending) ? (
                <button
                  type="button"
                  className="rydo-chip h-9 px-4"
                  onClick={onToggleInviteRedeem}
                >
                  {inviteRedeemOpen ? 'Close' : 'Invite code'}
                </button>
              ) : null}
            </div>
          ) : null}

          {showInviteRedeem ? (
            <div className="rydo-panel space-y-2 p-3">
              <div className="flex flex-wrap items-stretch gap-2">
                <input
                  value={inviteToken}
                  onChange={(e) => onInviteTokenChange(e.target.value)}
                  placeholder="Invite token"
                  className="min-w-[10rem] flex-1 rounded-xl border border-border bg-black/25 px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inviteToken.trim()) onRedeemInvite();
                  }}
                />
                <GradientCTA
                  type="button"
                  heightClass="h-10"
                  className="shrink-0 px-4 text-sm"
                  onClick={onRedeemInvite}
                  disabled={!inviteToken.trim() || redeemPending}
                >
                  Redeem
                </GradientCTA>
              </div>
              {redeemError ? <p className="text-xs text-red-400">Invalid or expired code.</p> : null}
            </div>
          ) : null}

          {canSeeMembers ? (
            <GradientCTA type="button" className="w-full text-sm" onClick={onScheduleOpen}>
              + Schedule ride
            </GradientCTA>
          ) : null}

          <section>
            <Eyebrow className="mb-2.5 ml-0.5">Club rides</Eyebrow>
            {ridesLoading ? (
              <div className="h-24 animate-pulse rounded-[28px] bg-surface-strong" />
            ) : rideSummary ? (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rydo-panel px-4 py-3 text-center">
                  <p className="rydo-stat-hero text-[28px] text-fg">{rideSummary.upcomingCount}</p>
                  <Eyebrow className="mt-1 text-[9px]">Upcoming</Eyebrow>
                </div>
                <div className="rydo-panel px-4 py-3 text-center">
                  <p className="rydo-stat-hero text-[28px] text-fg">{rideSummary.pastCount}</p>
                  <Eyebrow className="mt-1 text-[9px]">Past</Eyebrow>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="rydo-subtle mb-2 px-0.5 text-xs font-semibold uppercase tracking-wide">
                    Upcoming · {upcomingRides.length}
                  </p>
                  {upcomingRides.length === 0 ? (
                    <p className="rydo-subtle px-0.5 text-sm">No upcoming rides.</p>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {upcomingRides.map((ride) => (
                        <div key={ride.id} className="flex flex-col gap-1">
                          <RideListCardBold variant="upcoming" ride={ride} />
                          <p className="rydo-subtle px-1 text-[11px]">{ridePeopleSummary(ride)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="rydo-subtle mb-2 px-0.5 text-xs font-semibold uppercase tracking-wide">
                    Past · {pastRides.length}
                  </p>
                  {pastRides.length === 0 ? (
                    <p className="rydo-subtle px-0.5 text-sm">No past rides yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {pastRides.map((ride) => (
                        <div key={ride.id} className="flex flex-col gap-1">
                          <RideListCardBold variant="past" ride={ride} />
                          <p className="rydo-subtle px-1 text-[11px]">{ridePeopleSummary(ride)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {canSeeMembers ? (
            <section>
              <Eyebrow className="mb-2.5 ml-0.5">
                Members · {membersLoading ? '…' : sortedMembers.length}
              </Eyebrow>
              {membersLoading ? (
                <div className="h-16 animate-pulse rounded-[28px] bg-surface-strong" />
              ) : sortedMembers.length === 0 ? (
                <p className="rydo-subtle text-sm">No members to show.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {sortedMembers.map((m) => (
                    <ClubMemberChip
                      key={`${m.userId}-${m.membershipStatus || 'active'}`}
                      member={m}
                      viewerUserId={user?.id}
                      isClubAdmin={isAdmin}
                      approveMut={approveMut}
                      rejectMut={rejectMut}
                      promoteMut={promoteMut}
                      demoteMut={demoteMut}
                      removeMut={removeMut}
                    />
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {isMember && user ? (
            <div className="border-t border-border pt-4">
              <button
                type="button"
                className="text-sm font-semibold text-fg-muted transition hover:text-fg"
                onClick={onLeave}
                disabled={leavePending}
              >
                Leave club
              </button>
            </div>
          ) : null}

          {club.memberCount != null ? (
            <p className="rydo-subtle text-center text-xs">
              {club.memberCount} member{club.memberCount === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>
      </div>
    </BoldScreen>
  );
}
