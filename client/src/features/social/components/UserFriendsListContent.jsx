import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userProfilePath } from '@/shared/lib/user-paths';
import { useFriendsList, friendsListKeys } from '@/features/social/hooks/useFriendsList';
import { friendsApi } from '@/features/social/api/friends-api';
import { relationshipKeys } from '@/features/social/hooks/useRelationship';
import { inboxSummaryKeys } from '@/features/social/hooks/useInboxSummary';
import { inboxKeys } from '@/features/social/hooks/useInbox';
import { ApiError } from '@/shared/api/api-errors';
import Card from '@/shared/components/ui/card/Card';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { cn } from '@/shared/lib/cn';

function closeParentDetails(el) {
  const d = el?.closest?.('details');
  if (d) d.open = false;
}

function FriendListRow({ member, canUnfriend, onUnfriend, unfriendPending, isModal }) {
  const profileTo = userProfilePath(member.handle);
  const displayName = member.fullName?.trim() || 'Member';
  const detailsRef = useRef(null);

  const closeMenu = () => {
    const el = detailsRef.current;
    if (el?.open) el.open = false;
  };

  const rowClass = cn(
    'flex items-center gap-3 rounded-2xl border border-border bg-surface/80 p-3 transition hover:border-rydo-purple/35',
    isModal && 'bg-surface',
  );

  return (
    <li
      onMouseLeave={closeMenu}
      className={cn(canUnfriend && 'relative z-0 has-[details[open]]:z-(--rydo-z-route-elevated)')}
    >
      <div className={rowClass}>
        {profileTo ? (
          <Link to={profileTo} className="flex min-w-0 flex-1 items-center gap-3">
            <UserAvatar
              avatarUrl={member.avatarUrl}
              displayName={displayName}
              sizeClass="h-10 w-10"
              textClass="text-sm"
            />
            <span className="min-w-0 truncate font-medium text-fg">{displayName}</span>
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <UserAvatar
              avatarUrl={member.avatarUrl}
              displayName={displayName}
              sizeClass="h-10 w-10"
              textClass="text-sm"
            />
            <span className="min-w-0 truncate font-medium text-fg">{displayName}</span>
          </div>
        )}

        {canUnfriend && member.handle ? (
          <details
            ref={detailsRef}
            className="relative shrink-0 open:[&>summary]:bg-surface-strong open:[&>summary]:text-fg/90"
          >
            <summary
              className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-fg-subtle opacity-80 transition hover:bg-surface-strong hover:text-fg hover:opacity-100 [&::-webkit-details-marker]:hidden"
              aria-label={`Actions for ${displayName}`}
              onClick={(e) => e.stopPropagation()}
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
                <button
                  type="button"
                  role="menuitem"
                  disabled={unfriendPending}
                  className="flex w-full cursor-pointer px-3 py-2 text-left text-sm text-red-300/95 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={(e) => {
                    if (!window.confirm(`Unfriend ${displayName}?`)) return;
                    onUnfriend(member.handle);
                    closeParentDetails(e.currentTarget);
                  }}
                >
                  Unfriend
                </button>
              </div>
            </div>
          </details>
        ) : null}
      </div>
    </li>
  );
}

/**
 * @param {object} props
 * @param {string} props.handle
 * @param {boolean} props.enabled
 * @param {boolean} [props.canUnfriend]
 * @param {'default' | 'modal'} [props.variant]
 */
export function UserFriendsListContent({ handle, enabled, canUnfriend = false, variant = 'default' }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useFriendsList(handle, {
    enabled: enabled && Boolean(handle),
  });

  const unfriendMut = useMutation({
    mutationFn: (friendHandle) => friendsApi.unfriend(friendHandle),
    onSuccess: (_data, friendHandle) => {
      queryClient.invalidateQueries({ queryKey: friendsListKeys.all });
      queryClient.invalidateQueries({ queryKey: relationshipKeys.detail(friendHandle) });
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
  });

  const items = data?.items ?? [];
  const forbidden = error instanceof ApiError && error.status === 403;
  const isModal = variant === 'modal';

  if (isLoading) {
    return <p className={cn('text-sm text-fg-muted', isModal && 'px-1')}>Loading friends…</p>;
  }

  if (isError) {
    return (
      <Card className={cn('text-sm text-fg-muted', isModal ? 'border-0 bg-transparent p-0 shadow-none' : 'p-4')}>
        {forbidden ? 'You can’t view this friends list.' : error?.message || 'Could not load friends.'}
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className={cn('text-sm text-fg-muted', isModal ? 'border-0 bg-transparent p-0 shadow-none' : 'p-4')}>
        No friends to show yet.
      </Card>
    );
  }

  return (
    <ul className={cn('grid gap-2', !isModal && 'sm:grid-cols-2')}>
      {items.map((m) => (
        <FriendListRow
          key={m.id}
          member={m}
          canUnfriend={canUnfriend}
          onUnfriend={(friendHandle) => unfriendMut.mutate(friendHandle)}
          unfriendPending={unfriendMut.isPending}
          isModal={isModal}
        />
      ))}
    </ul>
  );
}
