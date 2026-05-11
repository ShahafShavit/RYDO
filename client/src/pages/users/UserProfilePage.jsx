import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUserProfile } from '@/features/users/hooks/useUserProfile';
import { friendsApi } from '@/features/social/api/friends-api';
import { relationshipKeys, useRelationship } from '@/features/social/hooks/useRelationship';
import { inboxSummaryKeys } from '@/features/social/hooks/useInboxSummary';
import { inboxKeys } from '@/features/social/hooks/useInbox';
import Button from '@/shared/components/ui/button/Button';
import { ApiError } from '@/shared/api/api-errors';
import { UserProfilePublicCard } from '@/features/users/components/UserProfilePublicCard';
import { UserProfileActivitySections } from '@/features/users/components/UserProfileActivitySections';
import { UserProfileFriendsSection } from '@/features/users/components/UserProfileFriendsSection';
import { usePageBreadcrumbDetail } from '@/shared/context/BreadcrumbContext';

export default function UserProfilePage() {
  const { userId } = useParams();
  const id = Number(userId);
  const { user: current } = useAuth();
  const isOwn = current?.id === id;
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isError, error } = useUserProfile(userId);
  const { data: relationship, isLoading: relLoading } = useRelationship(userId, { enabled: !isOwn });

  usePageBreadcrumbDetail(profile?.fullName);

  const sendMut = useMutation({
    mutationFn: () => friendsApi.sendFriendRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: relationshipKeys.detail(id) }),
  });

  const cancelMut = useMutation({
    mutationFn: () => friendsApi.cancelOutgoingFriendRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: relationshipKeys.detail(id) }),
  });

  const acceptMut = useMutation({
    mutationFn: (requestId) => friendsApi.acceptFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: relationshipKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
  });

  const declineMut = useMutation({
    mutationFn: (requestId) => friendsApi.declineFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: relationshipKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
  });

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-fg">Invalid profile</h1>
        <p className="text-fg-muted">This user link is not valid.</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="space-y-4">
        <p className="text-fg-muted">Loading profile…</p>
      </section>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    if (notFound) {
      return (
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold text-fg">User not found</h1>
          <p className="text-fg-muted">No account matches this profile.</p>
        </section>
      );
    }
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-fg">Could not load profile</h1>
        <p className="text-fg-muted">{error?.message || 'Something went wrong.'}</p>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="space-y-4">
        <p className="text-fg-muted">Loading profile…</p>
      </section>
    );
  }

  const publicFriendsListOnProfile = isOwn
    ? (profile?.privacy?.publicFriendsListOnProfile ?? true)
    : (profile?.publicFriendsListOnProfile ?? true);

  return (
    <section className="max-w-4xl space-y-6">
      <h1 className="sr-only">{profile.fullName || 'Rider'}</h1>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Member</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isOwn && relationship?.status === 'none' ? (
            <Button
              type="button"
              variant="primary"
              disabled={relLoading || sendMut.isPending}
              onClick={() => sendMut.mutate()}
            >
              Add friend
            </Button>
          ) : null}
          {!isOwn && relationship?.status === 'outgoing_pending' ? (
            <>
              <span className="text-sm text-fg-muted">Request sent</span>
              <Button
                type="button"
                variant="secondary"
                disabled={cancelMut.isPending}
                onClick={() => cancelMut.mutate()}
              >
                Cancel request
              </Button>
            </>
          ) : null}
          {!isOwn && relationship?.status === 'incoming_pending' && relationship.requestId != null ? (
            <>
              <Button
                type="button"
                variant="primary"
                disabled={acceptMut.isPending || declineMut.isPending}
                onClick={() => acceptMut.mutate(relationship.requestId)}
              >
                Accept
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={acceptMut.isPending || declineMut.isPending}
                onClick={() => declineMut.mutate(relationship.requestId)}
              >
                Decline
              </Button>
              <Link to={ROUTES.inbox} className="text-sm text-rydo-purple underline-offset-4 hover:underline">
                Open inbox
              </Link>
            </>
          ) : null}
          {!isOwn && relationship?.status === 'friends' ? (
            <span className="rounded-full border border-border px-3 py-1 text-sm text-fg-muted">Friends</span>
          ) : null}
          {isOwn ? (
            <Link to={`${ROUTES.settings}?tab=profile`} className="shrink-0">
              <Button variant="secondary">Edit profile</Button>
            </Link>
          ) : null}
        </div>
      </div>

      <UserProfilePublicCard profile={profile} userId={userId} />

      <UserProfileFriendsSection
        userId={id}
        isOwn={isOwn}
        publicFriendsListOnProfile={publicFriendsListOnProfile}
      />

      <UserProfileActivitySections userId={userId} profile={profile} isOwn={isOwn} />
    </section>
  );
}
