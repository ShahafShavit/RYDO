import { generatePath, Link } from 'react-router-dom';
import { UsersRound } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import { useFriendsList } from '@/features/social/hooks/useFriendsList';
import { ApiError } from '@/shared/api/api-errors';
import Card from '@/shared/components/ui/card/Card';
import UserAvatar from '@/shared/components/user/UserAvatar';

/**
 * @param {object} props
 * @param {number} props.userId
 * @param {boolean} props.isOwn
 * @param {boolean} props.publicFriendsListOnProfile — when false, only non-owners are blocked from seeing the list
 */
export function UserProfileFriendsSection({ userId, isOwn, publicFriendsListOnProfile }) {
  const id = Number(userId);
  const canFetch = isOwn || publicFriendsListOnProfile !== false;

  const { data, isLoading, isError, error } = useFriendsList(userId, {
    enabled: canFetch && Number.isFinite(id) && id > 0,
  });

  if (!isOwn && publicFriendsListOnProfile === false) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-fg-muted">
          <UsersRound className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
          <p className="text-sm">This member chose not to show their friends list on their profile.</p>
        </div>
      </Card>
    );
  }

  const items = data?.items ?? [];
  const forbidden = error instanceof ApiError && error.status === 403;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-fg">
          <UsersRound className="h-5 w-5 text-fg-muted" strokeWidth={2} aria-hidden />
          Friends
        </h2>
        {isOwn && publicFriendsListOnProfile === false ? (
          <p className="mt-1 text-xs text-fg-muted">
            Only you can see this list. Turn on “Show friends list on my profile” in Settings → Preferences to let
            friends see it.
          </p>
        ) : null}
      </div>
      {isLoading ? <p className="text-sm text-fg-muted">Loading friends…</p> : null}
      {isError ? (
        <Card className="p-4 text-sm text-fg-muted">
          {forbidden
            ? 'You can’t view this friends list.'
            : error?.message || 'Could not load friends.'}
        </Card>
      ) : null}
      {!isLoading && !isError && items.length === 0 ? (
        <Card className="p-4 text-sm text-fg-muted">No friends to show yet.</Card>
      ) : null}
      {!isLoading && !isError && items.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((m) => (
            <li key={m.id}>
              <Link
                to={generatePath(ROUTES.userProfile, { userId: String(m.id) })}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface/80 p-3 transition hover:border-rydo-purple/35"
              >
                <UserAvatar
                  avatarUrl={m.avatarUrl}
                  displayName={m.fullName}
                  sizeClass="h-10 w-10"
                  textClass="text-sm"
                />
                <span className="min-w-0 truncate font-medium text-fg">{m.fullName || 'Member'}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
