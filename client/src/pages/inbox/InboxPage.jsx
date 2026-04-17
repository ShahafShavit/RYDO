import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Inbox as InboxIcon } from 'lucide-react';
import { generatePath, Link } from 'react-router-dom';
import { friendsApi } from '@/features/social/api/friends-api';
import { inboxKeys, useInbox } from '@/features/social/hooks/useInbox';
import { inboxSummaryKeys } from '@/features/social/hooks/useInboxSummary';
import { relationshipKeys } from '@/features/social/hooks/useRelationship';
import { ROUTES } from '@/app/router/route-paths';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import UserAvatar from '@/shared/components/user/UserAvatar';

export default function InboxPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useInbox({ take: 50 });

  const acceptMut = useMutation({
    mutationFn: (requestId) => friendsApi.acceptFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
      queryClient.invalidateQueries({ queryKey: relationshipKeys.all });
    },
  });

  const declineMut = useMutation({
    mutationFn: (requestId) => friendsApi.declineFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
      queryClient.invalidateQueries({ queryKey: relationshipKeys.all });
    },
  });

  const items = data?.items ?? [];

  useEffect(() => {
    if (!items.length) return;
    const unread = items.filter((i) => !i.readAt && !i.resolvedAt);
    if (unread.length === 0) return;
    let cancelled = false;
    (async () => {
      await Promise.all(unread.map((i) => friendsApi.markInboxRead(i.id)));
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
        queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items, queryClient]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface-strong text-fg-muted">
            <InboxIcon className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-fg">Inbox</h1>
            <p className="mt-1 text-sm text-fg-muted">Friend requests and future notifications.</p>
          </div>
        </div>
      </div>

      {isLoading ? <p className="text-fg-muted">Loading…</p> : null}
      {isError ? (
        <p className="text-sm text-red-400">{error?.message || 'Could not load inbox.'}</p>
      ) : null}

      {!isLoading && !isError && items.length === 0 ? (
        <Card className="p-8 text-center text-fg-muted">Nothing here yet.</Card>
      ) : null}

      <ul className="space-y-3">
        {items.map((row) => {
          if (row.kind === 'friend_request' && row.friendRequest) {
            const fr = row.friendRequest;
            const from = fr.fromUser;
            const pending = fr.status === 'pending' && !row.resolvedAt;
            const profileHref = generatePath(ROUTES.userProfile, { userId: String(from.id) });
            return (
              <li key={row.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <Link to={profileHref} className="flex min-w-0 flex-1 items-center gap-3">
                      <UserAvatar
                        avatarUrl={from.avatarUrl}
                        displayName={from.fullName}
                        sizeClass="h-11 w-11"
                        textClass="text-sm"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-fg">
                          <span className="text-fg-muted">Friend request from </span>
                          {from.fullName || 'Member'}
                        </p>
                        <p className="text-xs text-fg-muted">
                          {pending ? 'Waiting for your response.' : 'Resolved.'}
                        </p>
                      </div>
                    </Link>
                    {pending ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          className="min-w-[88px]"
                          disabled={acceptMut.isPending || declineMut.isPending}
                          onClick={() => acceptMut.mutate(fr.id)}
                        >
                          Accept
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-w-[88px]"
                          disabled={acceptMut.isPending || declineMut.isPending}
                          onClick={() => declineMut.mutate(fr.id)}
                        >
                          Decline
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          }
          return (
            <li key={row.id}>
              <Card className="p-4 text-sm text-fg-muted">Unsupported item ({row.kind})</Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
