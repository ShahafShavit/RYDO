import { UsersRound } from 'lucide-react';
import { UserFriendsListContent } from '@/features/social/components/UserFriendsListContent';
import { canViewUserFriendsList } from '@/features/social/friends-utils';
import Card from '@/shared/components/ui/card/Card';

/**
 * @param {object} props
 * @param {string} props.handle
 * @param {boolean} props.isOwn
 * @param {boolean} props.publicFriendsListOnProfile — when false, only non-owners are blocked from seeing the list
 * @param {string | undefined} props.relationshipStatus
 */
export function UserProfileFriendsSection({
  handle,
  isOwn,
  publicFriendsListOnProfile,
  relationshipStatus,
}) {

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

  const canView = canViewUserFriendsList({
    isOwn,
    publicFriendsListOnProfile,
    relationshipStatus,
  });

  if (!canView) {
    return null;
  }

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
      <UserFriendsListContent
        handle={handle}
        enabled={Boolean(handle)}
      />
    </section>
  );
}
