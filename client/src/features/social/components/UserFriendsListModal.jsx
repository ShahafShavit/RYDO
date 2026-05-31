import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel } from '@/shared/components/ui/modal/ModalPrimitives';
import { UserFriendsListContent } from '@/features/social/components/UserFriendsListContent';
import { cn } from '@/shared/lib/cn';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.handle
 * @param {boolean} props.isOwn
 * @param {string} [props.displayName]
 * @param {boolean} props.publicFriendsListOnProfile
 */
export default function UserFriendsListModal({
  open,
  onClose,
  handle,
  isOwn,
  displayName,
  publicFriendsListOnProfile,
}) {
  const titleId = 'user-friends-list-title';
  const title = isOwn ? 'Your friends' : `${displayName?.trim() || 'Member'}'s friends`;

  return (
    <AnimatedModal open={open} onClose={onClose} maxWidthClassName="max-w-lg">
      <ModalPanel
        className={cn(
          'flex max-h-[min(90vh,720px)] w-full min-h-0 flex-col overflow-hidden',
          'max-md:h-full max-md:max-h-none max-md:rounded-none max-md:border-0',
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <ModalHeader title={title} titleId={titleId} onClose={onClose} divider />

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {isOwn && publicFriendsListOnProfile === false ? (
            <p className="mb-3 text-xs text-fg-muted">
              Only you can see this list. Turn on “Show friends list on my profile” in Settings → Preferences to let
              friends see it.
            </p>
          ) : null}
          <UserFriendsListContent handle={handle} enabled={open} variant="modal" />
        </div>
      </ModalPanel>
    </AnimatedModal>
  );
}
