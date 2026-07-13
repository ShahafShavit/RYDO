import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import Button from '@/shared/components/ui/button/Button';
import { cn } from '@/shared/lib/cn';

/**
 * Relationship CTAs for another user's profile (desktop + mobile bold).
 * @param {{
 *   relationship?: { status?: string, requestId?: number } | null,
 *   relLoading?: boolean,
 *   sendMut: { isPending: boolean, mutate: () => void },
 *   cancelMut: { isPending: boolean, mutate: () => void },
 *   acceptMut: { isPending: boolean, mutate: (requestId: number) => void },
 *   declineMut: { isPending: boolean, mutate: (requestId: number) => void },
 *   showInboxLink?: boolean,
 *   className?: string,
 *   size?: 'default' | 'sm',
 * }} props
 */
export default function UserProfileFriendActions({
  relationship,
  relLoading = false,
  sendMut,
  cancelMut,
  acceptMut,
  declineMut,
  showInboxLink = true,
  className,
  size = 'default',
}) {
  const status = relationship?.status;
  const btnClass = size === 'sm' ? 'h-8 px-3 text-xs' : undefined;

  if (status === 'none') {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <Button
          type="button"
          variant="primary"
          className={btnClass}
          disabled={relLoading || sendMut.isPending}
          onClick={() => sendMut.mutate()}
        >
          Add friend
        </Button>
      </div>
    );
  }

  if (status === 'outgoing_pending') {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <span className={cn('text-fg-muted', size === 'sm' ? 'text-xs' : 'text-sm')}>Request sent</span>
        <Button
          type="button"
          variant="secondary"
          className={btnClass}
          disabled={cancelMut.isPending}
          onClick={() => cancelMut.mutate()}
        >
          Cancel request
        </Button>
      </div>
    );
  }

  if (status === 'incoming_pending' && relationship.requestId != null) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <Button
          type="button"
          variant="primary"
          className={btnClass}
          disabled={acceptMut.isPending || declineMut.isPending}
          onClick={() => acceptMut.mutate(relationship.requestId)}
        >
          Accept
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={btnClass}
          disabled={acceptMut.isPending || declineMut.isPending}
          onClick={() => declineMut.mutate(relationship.requestId)}
        >
          Decline
        </Button>
        {showInboxLink ? (
          <Link to={ROUTES.inbox} className="text-sm text-rydo-purple underline-offset-4 hover:underline">
            Open inbox
          </Link>
        ) : null}
      </div>
    );
  }

  if (status === 'friends') {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <span
          className={cn(
            'rounded-full border border-border px-3 py-1 text-fg-muted',
            size === 'sm' ? 'text-xs' : 'text-sm',
          )}
        >
          Friends
        </span>
      </div>
    );
  }

  return null;
}
