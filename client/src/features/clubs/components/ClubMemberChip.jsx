import { useRef } from 'react';
import { Link, generatePath } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { cn } from '@/shared/lib/cn';
import UserAvatar from '@/shared/components/user/UserAvatar';

function closeParentDetails(el) {
  const d = el?.closest?.('details');
  if (d) d.open = false;
}

export default function ClubMemberChip({
  member,
  viewerUserId,
  isClubAdmin,
  approveMut,
  rejectMut,
  promoteMut,
  demoteMut,
  removeMut,
}) {
  const isSelf = member.userId === viewerUserId;
  const isPending = member.membershipStatus === 'pending';
  const isActive = member.membershipStatus === 'active' || member.membershipStatus == null;
  const showActions = isClubAdmin && !isSelf;

  const adminAvatarClass =
    member.role === 'admin' && isActive
      ? 'ring-2 ring-rydo-green/75 ring-offset-[3px] ring-offset-[var(--rydo-bg-deep)]'
      : undefined;

  const busy =
    approveMut.isPending ||
    rejectMut.isPending ||
    promoteMut.isPending ||
    demoteMut.isPending ||
    removeMut.isPending;

  const detailsRef = useRef(null);

  const closeMenu = () => {
    const el = detailsRef.current;
    if (el?.open) el.open = false;
  };

  return (
    <li
      onMouseLeave={closeMenu}
      className={cn(
        'flex min-w-0 max-w-full items-center gap-1 rounded-full border border-border bg-surface py-1 pl-1 pr-1.5 text-sm text-fg/80 sm:max-w-md',
        showActions && 'relative z-0 has-[details[open]]:z-(--rydo-z-route-elevated)',
      )}
    >
      <Link
        to={generatePath(ROUTES.userProfile, { userId: String(member.userId) })}
        className="flex min-w-0 flex-1 items-center gap-2 hover:text-fg"
      >
        <UserAvatar
          avatarUrl={member.avatarUrl}
          displayName={member.displayName || `User ${member.userId}`}
          sizeClass="h-7 w-7"
          textClass="text-[10px]"
          className={adminAvatarClass}
        />
        <span className="truncate">{member.displayName || `User ${member.userId}`}</span>
      </Link>
      {member.role === 'admin' && isActive ? <span className="sr-only">Admin</span> : null}
      {isPending ? <span className="shrink-0 text-xs text-amber-300/90">Pending</span> : null}

      {showActions ? (
        <details
          ref={detailsRef}
          className="relative shrink-0 open:[&>summary]:bg-surface-strong open:[&>summary]:text-fg/90"
        >
          <summary
            className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full text-fg-subtle opacity-80 transition hover:bg-surface-strong hover:text-fg hover:opacity-100 [&::-webkit-details-marker]:hidden"
            aria-label="Member actions"
          >
            ⋮
          </summary>
          <div
            className="invisible absolute right-0 top-full z-(--rydo-z-route-elevated) min-w-[11rem] pt-1 opacity-0 transition duration-150 [details[open]_&]:visible [details[open]_&]:opacity-100"
            role="presentation"
          >
            <div
              className="rounded-xl border border-border bg-zinc-950/98 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-md"
              role="menu"
            >
            {isPending ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  className="flex w-full cursor-pointer px-3 py-2 text-left text-sm text-fg/90 hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={(e) => {
                    approveMut.mutate(member.userId);
                    closeParentDetails(e.currentTarget);
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  className="flex w-full cursor-pointer px-3 py-2 text-left text-sm text-amber-200/95 hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={(e) => {
                    rejectMut.mutate(member.userId);
                    closeParentDetails(e.currentTarget);
                  }}
                >
                  Deny request
                </button>
              </>
            ) : (
              <>
                {member.role === 'member' ? (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    className="flex w-full cursor-pointer px-3 py-2 text-left text-sm text-fg/90 hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={(e) => {
                      promoteMut.mutate(member.userId);
                      closeParentDetails(e.currentTarget);
                    }}
                  >
                    Make admin
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    className="flex w-full cursor-pointer px-3 py-2 text-left text-sm text-fg/90 hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={(e) => {
                      demoteMut.mutate(member.userId);
                      closeParentDetails(e.currentTarget);
                    }}
                  >
                    Demote from admin
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  className="flex w-full cursor-pointer px-3 py-2 text-left text-sm text-red-300/95 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={(e) => {
                    if (!window.confirm('Remove this person from the club?')) return;
                    removeMut.mutate(member.userId);
                    closeParentDetails(e.currentTarget);
                  }}
                >
                  Remove from club…
                </button>
              </>
            )}
            </div>
          </div>
        </details>
      ) : null}
    </li>
  );
}
