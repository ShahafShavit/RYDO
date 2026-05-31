import { generatePath, Link, useNavigate } from 'react-router-dom';
import { userProfilePath } from '@/shared/lib/user-paths';
import { ArrowLeft, Inbox as InboxIcon } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import InboxTabs from '@/features/social/components/InboxTabs';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import GradientCTA from '@/shared/components/bold/GradientCTA';
import IconButton from '@/shared/components/bold/IconButton';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import BoldScrollArea from '@/shared/components/bold/BoldScrollArea';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { cn } from '@/shared/lib/cn';

const TAB_EMPTY = {
  friends: 'Friend requests will show up here.',
  rides: 'Ride invites and new club rides will show up here.',
  club: 'Club join requests will show up here.',
};

function InboxRequestCard({
  avatarUrl,
  displayName,
  pill,
  pillVariant,
  description,
  profileHref,
  acceptLabel,
  onAccept,
  onDecline,
  busy,
  pending,
  singleAction,
  singleActionLabel,
  onSingleAction,
}) {
  return (
    <div className="rydo-bold-glass-row flex flex-col gap-3 p-3.5">
      <div className="flex items-center gap-3">
        {profileHref ? (
          <Link
            to={profileHref}
            className={cn(
              'shrink-0 rounded-full no-underline',
              pillVariant === 'green'
                ? 'shadow-[0_0_0_2px_rgba(26,199,138,0.4)]'
                : 'shadow-[0_0_0_2px_rgba(123,92,255,0.4)]',
            )}
          >
            <UserAvatar
              avatarUrl={avatarUrl}
              displayName={displayName}
              sizeClass="h-11 w-11"
              textClass="text-sm"
            />
          </Link>
        ) : (
          <UserAvatar
            avatarUrl={avatarUrl}
            displayName={displayName}
            sizeClass="h-11 w-11"
            textClass="text-sm"
          />
        )}
        <div className="min-w-0 flex-1">
          {profileHref ? (
            <Link to={profileHref} className="text-[14.5px] font-bold leading-tight text-fg no-underline">
              {displayName}
            </Link>
          ) : (
            <p className="text-[14.5px] font-bold leading-tight text-fg">{displayName}</p>
          )}
          <p className="rydo-subtle mt-0.5 text-xs leading-snug">
            <span
              className={cn(
                'rydo-pill mr-1.5 !py-0.5 !px-2 !text-[10px] !font-semibold',
                pillVariant === 'green' ? 'rydo-pill-green' : 'rydo-pill-accent',
              )}
            >
              {pill}
            </span>
            {description}
          </p>
        </div>
      </div>
      {pending && singleAction ? (
        <GradientCTA
          type="button"
          heightClass="h-10"
          className="w-full text-[13.5px]"
          disabled={busy}
          onClick={onSingleAction}
        >
          {singleActionLabel}
        </GradientCTA>
      ) : null}
      {pending && !singleAction ? (
        <div className="flex gap-2">
          <GradientCTA
            type="button"
            heightClass="h-10"
            className="min-w-0 flex-1 text-[13.5px]"
            disabled={busy}
            onClick={onAccept}
          >
            {acceptLabel}
          </GradientCTA>
          <button
            type="button"
            className="rydo-chip h-10 min-w-0 flex-1 text-[13.5px] font-bold text-fg"
            disabled={busy}
            onClick={onDecline}
          >
            Decline
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function InboxPageBold({
  activeTab,
  onTabChange,
  tabCounts,
  items,
  isLoading,
  isError,
  error,
  acceptMut,
  declineMut,
  approveClubMut,
  rejectClubMut,
  acceptRideInviteMut,
  declineRideInviteMut,
  markReadMut,
}) {
  const navigate = useNavigate();
  const friendBusy = acceptMut.isPending || declineMut.isPending;
  const clubBusy = approveClubMut.isPending || rejectClubMut.isPending;
  const rideInviteBusy = acceptRideInviteMut.isPending || declineRideInviteMut.isPending;

  const pendingItems = items.filter((row) => {
    if (row.resolvedAt) return false;
    if (row.kind === 'friend_request' && row.friendRequest) {
      return row.friendRequest.status === 'pending';
    }
    if (row.kind === 'club_join_request') return true;
    if (row.kind === 'ride_invite' && row.rideInvite) {
      return row.rideInvite.status === 'pending';
    }
    if (row.kind === 'club_ride_announced') return !row.readAt;
    return false;
  });

  return (
    <BoldScreen>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-5 pb-1 pt-1">
          <IconButton icon={ArrowLeft} aria-label="Back" onClick={() => navigate(-1)} />
          <div className="min-w-0 flex-1">
            <DisplayTitle as="div" size="sm">
              Inbox
            </DisplayTitle>
          </div>
        </header>

        <div className="px-4 pt-2">
          <InboxTabs activeTab={activeTab} onTabChange={onTabChange} counts={tabCounts} />
        </div>

        <BoldScrollArea className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-3">
          {isLoading ? (
            <>
              <div className="h-28 animate-pulse rounded-[28px] bg-surface-strong/60" aria-hidden />
              <div className="h-28 animate-pulse rounded-[28px] bg-surface-strong/60" aria-hidden />
            </>
          ) : null}

          {isError ? (
            <p className="rydo-subtle rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error?.message || 'Could not load inbox.'}
            </p>
          ) : null}

          {!isLoading && !isError && items.length === 0 ? (
            <div className="rydo-panel flex flex-col items-center gap-2 px-6 py-10 text-center">
              <InboxIcon className="h-8 w-8 text-fg-subtle" strokeWidth={1.75} aria-hidden />
              <p className="text-sm font-semibold text-fg">Nothing here yet</p>
              <p className="rydo-subtle text-xs">{TAB_EMPTY[activeTab]}</p>
            </div>
          ) : null}

          {!isLoading && !isError && pendingItems.length > 0 ? (
            <Eyebrow className="ml-0.5">
              {pendingItems.length} pending
            </Eyebrow>
          ) : null}

          {!isLoading && !isError
            ? items.map((row) => {
                if (row.kind === 'friend_request' && row.friendRequest) {
                  const fr = row.friendRequest;
                  const from = fr.fromUser;
                  const pending = fr.status === 'pending' && !row.resolvedAt;
                  const profileHref = userProfilePath(from.handle);
                  return (
                    <InboxRequestCard
                      key={row.id}
                      avatarUrl={from.avatarUrl}
                      displayName={from.fullName || 'Member'}
                      pill="Friend"
                      pillVariant="accent"
                      description="Wants to be friends"
                      profileHref={profileHref}
                      pending={pending}
                      acceptLabel="Accept"
                      busy={friendBusy}
                      onAccept={() => acceptMut.mutate(fr.id)}
                      onDecline={() => declineMut.mutate(fr.id)}
                    />
                  );
                }

                if (row.kind === 'club_join_request' && row.clubJoinRequest) {
                  const cjr = row.clubJoinRequest;
                  const club = cjr.club;
                  const requester = cjr.requester;
                  const pending = !row.resolvedAt;
                  const profileHref = userProfilePath(requester.handle);
                  const clubHref = generatePath(ROUTES.clubDetails, { clubId: String(club.id) });
                  return (
                    <InboxRequestCard
                      key={row.id}
                      avatarUrl={requester.avatarUrl}
                      displayName={requester.fullName || 'Member'}
                      pill="Club"
                      pillVariant="green"
                      description={
                        <>
                          requested to join{' '}
                          <Link to={clubHref} className="font-semibold text-fg no-underline">
                            {club.name}
                          </Link>
                        </>
                      }
                      profileHref={profileHref}
                      pending={pending}
                      acceptLabel="Approve"
                      busy={clubBusy}
                      onAccept={() =>
                        approveClubMut.mutate({ clubId: club.id, userId: requester.id })
                      }
                      onDecline={() =>
                        rejectClubMut.mutate({ clubId: club.id, userId: requester.id })
                      }
                    />
                  );
                }

                if (row.kind === 'ride_invite' && row.rideInvite) {
                  const ri = row.rideInvite;
                  const from = ri.fromUser;
                  const ride = ri.ride;
                  const pending = ri.status === 'pending' && !row.resolvedAt;
                  const profileHref = userProfilePath(from?.handle);
                  return (
                    <InboxRequestCard
                      key={row.id}
                      avatarUrl={from?.avatarUrl}
                      displayName={from?.fullName || 'Member'}
                      pill="Ride"
                      pillVariant="accent"
                      description={
                        <>
                          invited you to{' '}
                          <span className="font-semibold text-fg">{ride?.name || 'a ride'}</span>
                        </>
                      }
                      profileHref={profileHref}
                      pending={pending}
                      acceptLabel="Accept"
                      busy={rideInviteBusy}
                      onAccept={() =>
                        acceptRideInviteMut.mutate({ rideId: ride.id, inviteId: ri.id })
                      }
                      onDecline={() =>
                        declineRideInviteMut.mutate({ rideId: ride.id, inviteId: ri.id })
                      }
                    />
                  );
                }

                if (row.kind === 'club_ride_announced' && row.clubRideAnnounced) {
                  const ann = row.clubRideAnnounced;
                  const ride = ann.ride;
                  const club = ann.club;
                  const rideHref = generatePath(ROUTES.rideEvent, { rideId: String(ride?.id ?? '') });
                  return (
                    <InboxRequestCard
                      key={row.id}
                      avatarUrl={ann.createdBy?.avatarUrl}
                      displayName={club?.name || 'Club ride'}
                      pill="Ride"
                      pillVariant="green"
                      description={
                        <>
                          New ride: <span className="font-semibold text-fg">{ride?.name || 'Scheduled ride'}</span>
                        </>
                      }
                      profileHref={null}
                      pending={!row.readAt}
                      singleAction
                      singleActionLabel="View ride"
                      busy={markReadMut.isPending}
                      onSingleAction={() => {
                        if (!row.readAt) markReadMut.mutate(row.id);
                        navigate(rideHref);
                      }}
                    />
                  );
                }

                return (
                  <div key={row.id} className="rydo-bold-glass-row p-3.5">
                    <p className="rydo-subtle text-sm">Unsupported item ({row.kind})</p>
                  </div>
                );
              })
            : null}
        </BoldScrollArea>
      </div>
    </BoldScreen>
  );
}
