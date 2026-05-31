import { generatePath, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox as InboxIcon } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import GradientCTA from '@/shared/components/bold/GradientCTA';
import IconButton from '@/shared/components/bold/IconButton';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import BoldScrollArea from '@/shared/components/bold/BoldScrollArea';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { cn } from '@/shared/lib/cn';

function InboxRequestCard({
  avatarUrl,
  displayName,
  kind,
  description,
  profileHref,
  acceptLabel,
  onAccept,
  onDecline,
  busy,
  pending,
}) {
  const isClub = kind === 'club';

  return (
    <div className="rydo-bold-glass-row flex flex-col gap-3 p-3.5">
      <div className="flex items-center gap-3">
        <Link
          to={profileHref}
          className={cn(
            'shrink-0 rounded-full no-underline',
            isClub
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
        <div className="min-w-0 flex-1">
          <Link to={profileHref} className="text-[14.5px] font-bold leading-tight text-fg no-underline">
            {displayName}
          </Link>
          <p className="rydo-subtle mt-0.5 text-xs leading-snug">
            <span
              className={cn(
                'rydo-pill mr-1.5 !py-0.5 !px-2 !text-[10px] !font-semibold',
                isClub ? 'rydo-pill-green' : 'rydo-pill-accent',
              )}
            >
              {isClub ? 'Club' : 'Friend'}
            </span>
            {description}
          </p>
        </div>
      </div>
      {pending ? (
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
  items,
  isLoading,
  isError,
  error,
  acceptMut,
  declineMut,
  approveClubMut,
  rejectClubMut,
}) {
  const navigate = useNavigate();
  const friendBusy = acceptMut.isPending || declineMut.isPending;
  const clubBusy = approveClubMut.isPending || rejectClubMut.isPending;

  const pendingItems = items.filter((row) => {
    if (row.resolvedAt) return false;
    if (row.kind === 'friend_request' && row.friendRequest) {
      return row.friendRequest.status === 'pending';
    }
    if (row.kind === 'club_join_request') return true;
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

        <BoldScrollArea className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4 pt-3">
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
              <p className="rydo-subtle text-xs">
                Friend requests and club join requests will show up here.
              </p>
            </div>
          ) : null}

          {!isLoading && !isError && pendingItems.length > 0 ? (
            <Eyebrow className="ml-0.5">
              {pendingItems.length} pending request{pendingItems.length === 1 ? '' : 's'}
            </Eyebrow>
          ) : null}

          {!isLoading && !isError
            ? items.map((row) => {
                if (row.kind === 'friend_request' && row.friendRequest) {
                  const fr = row.friendRequest;
                  const from = fr.fromUser;
                  const pending = fr.status === 'pending' && !row.resolvedAt;
                  const profileHref = generatePath(ROUTES.userProfile, { userId: String(from.id) });
                  return (
                    <InboxRequestCard
                      key={row.id}
                      avatarUrl={from.avatarUrl}
                      displayName={from.fullName || 'Member'}
                      kind="friend"
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
                  const profileHref = generatePath(ROUTES.userProfile, {
                    userId: String(requester.id),
                  });
                  const clubHref = generatePath(ROUTES.clubDetails, { clubId: String(club.id) });
                  return (
                    <InboxRequestCard
                      key={row.id}
                      avatarUrl={requester.avatarUrl}
                      displayName={requester.fullName || 'Member'}
                      kind="club"
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
