import { Link } from 'react-router-dom';
import { userProfilePath } from '@/shared/lib/user-paths';
import { useFriendsList } from '@/features/social/hooks/useFriendsList';
import { ApiError } from '@/shared/api/api-errors';
import Card from '@/shared/components/ui/card/Card';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { cn } from '@/shared/lib/cn';

/**
 * @param {object} props
 * @param {string} props.handle
 * @param {boolean} props.enabled
 * @param {'default' | 'modal'} [props.variant]
 */
export function UserFriendsListContent({ handle, enabled, variant = 'default' }) {
  const { data, isLoading, isError, error } = useFriendsList(handle, {
    enabled: enabled && Boolean(handle),
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
      {items.map((m) => {
        const profileTo = userProfilePath(m.handle);
        const rowClass = cn(
          'flex items-center gap-3 rounded-2xl border border-border bg-surface/80 p-3 transition hover:border-rydo-purple/35',
          isModal && 'bg-surface',
        );

        return (
          <li key={m.id}>
            {profileTo ? (
              <Link to={profileTo} className={rowClass}>
                <UserAvatar
                  avatarUrl={m.avatarUrl}
                  displayName={m.fullName}
                  sizeClass="h-10 w-10"
                  textClass="text-sm"
                />
                <span className="min-w-0 truncate font-medium text-fg">{m.fullName || 'Member'}</span>
              </Link>
            ) : (
              <div className={rowClass}>
                <UserAvatar
                  avatarUrl={m.avatarUrl}
                  displayName={m.fullName}
                  sizeClass="h-10 w-10"
                  textClass="text-sm"
                />
                <span className="min-w-0 truncate font-medium text-fg">{m.fullName || 'Member'}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
