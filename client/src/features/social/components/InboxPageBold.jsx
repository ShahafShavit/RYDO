import { generatePath, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox as InboxIcon, UserPlus, Users } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import GradientCTA from '@/shared/components/bold/GradientCTA';
import IconButton from '@/shared/components/bold/IconButton';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { cn } from '@/shared/lib/cn';

function InboxItemShell({ icon: Icon, children, pending, className }) {
  return (
    <div
      className={cn(
        'rydo-bold-glass-row flex flex-col gap-3 p-3.5',
        pending && 'border-rydo-purple/35',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-strong text-fg-muted">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function ActionRow({ acceptLabel, onAccept, onDecline, busy }) {
  return (
    <div className="flex gap-2 pl-[52px]">
      <GradientCTA
        type="button"
        heightClass="h-9"
        className="min-w-0 flex-1 px-3 text-xs"
        disabled={busy}
        onClick={onAccept}
      >
        {acceptLabel}
      </GradientCTA>
      <button
        type="button"
        className="rydo-chip h-9 min-w-0 flex-1 px-3 text-xs font-semibold"
        disabled={busy}
        onClick={onDecline}
      >
        Decline
      </button>
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

  return (
    <BoldScreen>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-5 pb-1 pt-1">
          <IconButton
            icon={ArrowLeft}
            aria-label="Back"
            onClick={() => navigate(-1)}
          />
          <div className="min-w-0 flex-1">
            <Eyebrow>Notifications</Eyebrow>
            <DisplayTitle as="div" size="sm" className="mt-0.5 text-xl">
              Inbox
            </DisplayTitle>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4 pt-3">
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
              <p className="rydo-subtle text-xs">Friend requests and club join requests will show up here.</p>
            </div>
          ) : null}

          {!isLoading && !isError
            ? items.map((row) => {
                if (row.kind === 'friend_request' && row.friendRequest) {
                  const fr = row.friendRequest;
                  const from = fr.fromUser;
                  const pending = fr.status === 'pending' && !row.resolvedAt;
                  const profileHref = generatePath(ROUTES.userProfile, { userId: String(from.id) });
                  return (
                    <div key={row.id} className="flex flex-col gap-2">
                      <InboxItemShell icon={UserPlus} pending={pending}>
                        <Link to={profileHref} className="flex items-center gap-3 no-underline">
                          <UserAvatar
                            avatarUrl={from.avatarUrl}
                            displayName={from.fullName}
                            sizeClass="h-11 w-11"
                            textClass="text-sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-fg">
                              {from.fullName || 'Member'}
                            </p>
                            <p className="rydo-subtle text-[11px]">
                              {pending ? 'Sent you a friend request' : 'Friend request resolved'}
                            </p>
                          </div>
                        </Link>
                      </InboxItemShell>
                      {pending ? (
                        <ActionRow
                          acceptLabel="Accept"
                          busy={friendBusy}
                          onAccept={() => acceptMut.mutate(fr.id)}
                          onDecline={() => declineMut.mutate(fr.id)}
                        />
                      ) : null}
                    </div>
                  );
                }

                if (row.kind === 'club_join_request' && row.clubJoinRequest) {
                  const cjr = row.clubJoinRequest;
                  const club = cjr.club;
                  const requester = cjr.requester;
                  const pending = !row.resolvedAt;
                  const profileHref = generatePath(ROUTES.userProfile, { userId: String(requester.id) });
                  const clubHref = generatePath(ROUTES.clubDetails, { clubId: String(club.id) });
                  return (
                    <div key={row.id} className="flex flex-col gap-2">
                      <InboxItemShell icon={Users} pending={pending}>
                        <div className="flex items-center gap-3">
                          <Link to={profileHref} className="shrink-0 no-underline">
                            <UserAvatar
                              avatarUrl={requester.avatarUrl}
                              displayName={requester.fullName}
                              sizeClass="h-11 w-11"
                              textClass="text-sm"
                            />
                          </Link>
                          <div className="min-w-0 text-sm leading-snug">
                            <Link to={profileHref} className="font-semibold text-fg no-underline">
                              {requester.fullName || 'Member'}
                            </Link>
                            <span className="rydo-subtle"> requested to join </span>
                            <Link
                              to={clubHref}
                              className="font-semibold text-rydo-purple no-underline"
                            >
                              {club.name}
                            </Link>
                            <p className="rydo-subtle mt-1 text-[11px]">
                              {pending ? 'Approve or decline this request' : 'Join request resolved'}
                            </p>
                          </div>
                        </div>
                      </InboxItemShell>
                      {pending ? (
                        <ActionRow
                          acceptLabel="Approve"
                          busy={clubBusy}
                          onAccept={() =>
                            approveClubMut.mutate({ clubId: club.id, userId: requester.id })
                          }
                          onDecline={() =>
                            rejectClubMut.mutate({ clubId: club.id, userId: requester.id })
                          }
                        />
                      ) : null}
                    </div>
                  );
                }

                return (
                  <InboxItemShell key={row.id} icon={InboxIcon} pending={false}>
                    <p className="rydo-subtle text-sm">Unsupported item ({row.kind})</p>
                  </InboxItemShell>
                );
              })
            : null}
        </div>
      </div>
    </BoldScreen>
  );
}
