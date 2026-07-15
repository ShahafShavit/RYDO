import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUserProfile } from '@/features/users/hooks/useUserProfile';
import { friendsApi } from '@/features/social/api/friends-api';
import { relationshipKeys, useRelationship } from '@/features/social/hooks/useRelationship';
import { friendsListKeys } from '@/features/social/hooks/useFriendsList';
import { inboxSummaryKeys } from '@/features/social/hooks/useInboxSummary';
import { inboxKeys } from '@/features/social/hooks/useInbox';
import Button from '@/shared/components/ui/button/Button';
import { ApiError } from '@/shared/api/api-errors';
import { UserProfilePublicCard } from '@/features/users/components/UserProfilePublicCard';
import { UserProfileActivitySections } from '@/features/users/components/UserProfileActivitySections';
import { UserProfileFriendsSection } from '@/features/users/components/UserProfileFriendsSection';
import UserProfilePageBold from '@/features/users/components/UserProfilePageBold';
import UserProfileFriendActions from '@/features/social/components/UserProfileFriendActions';
import { AdminModeSettingsRow } from '@/features/admin/components/AdminModeNavLink';
import { usePageBreadcrumbDetail } from '@/shared/context/BreadcrumbContext';
import { normalizeHandle } from '@/shared/lib/user-paths';

export default function UserProfilePage() {
  const { handle: handleParam } = useParams();
  const handle = normalizeHandle(handleParam);
  const { user: current, isAdmin } = useAuth();
  const isOwn = Boolean(current?.handle && handle && current.handle === handle);
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isError, error } = useUserProfile(handle);
  const { data: relationship, isLoading: relLoading } = useRelationship(handle, { enabled: !isOwn });

  usePageBreadcrumbDetail(profile?.fullName);

  const sendMut = useMutation({
    mutationFn: () => friendsApi.sendFriendRequest(handle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: relationshipKeys.detail(handle) });
      queryClient.invalidateQueries({ queryKey: friendsListKeys.all });
    },
  });

  const cancelMut = useMutation({
    mutationFn: () => friendsApi.cancelOutgoingFriendRequest(handle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: relationshipKeys.detail(handle) });
      queryClient.invalidateQueries({ queryKey: friendsListKeys.all });
    },
  });

  const acceptMut = useMutation({
    mutationFn: (requestId) => friendsApi.acceptFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: relationshipKeys.detail(handle) });
      queryClient.invalidateQueries({ queryKey: friendsListKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
  });

  const declineMut = useMutation({
    mutationFn: (requestId) => friendsApi.declineFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: relationshipKeys.detail(handle) });
      queryClient.invalidateQueries({ queryKey: friendsListKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
  });

  const unfriendMut = useMutation({
    mutationFn: () => friendsApi.unfriend(handle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: relationshipKeys.detail(handle) });
      queryClient.invalidateQueries({ queryKey: friendsListKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
  });

  if (!handle) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-fg">Invalid profile</h1>
        <p className="text-fg-muted">This user link is not valid.</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <>
        <section className="hidden space-y-4 md:block">
          <p className="text-fg-muted">Loading profile…</p>
        </section>
        <div className="md:hidden">
          <p className="p-5 text-fg-muted">Loading profile…</p>
        </div>
      </>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    const message = notFound ? 'User not found' : 'Could not load profile';
    return (
      <section className="space-y-4 p-5 md:p-0">
        <h1 className="text-2xl font-semibold text-fg">{message}</h1>
        <p className="text-fg-muted">{notFound ? 'No account matches this profile.' : error?.message}</p>
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
    <>
      <section className="hidden max-w-4xl space-y-6 md:block">
        <h1 className="sr-only">{profile.fullName || 'Rider'}</h1>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Member</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isOwn ? (
              <UserProfileFriendActions
                relationship={relationship}
                relLoading={relLoading}
                sendMut={sendMut}
                cancelMut={cancelMut}
                acceptMut={acceptMut}
                declineMut={declineMut}
                unfriendMut={unfriendMut}
                displayName={profile.fullName}
              />
            ) : null}
            {isOwn ? (
              <Link to={`${ROUTES.settings}?tab=profile`} className="shrink-0">
                <Button variant="secondary">Edit profile</Button>
              </Link>
            ) : null}
          </div>
        </div>

        <UserProfilePublicCard profile={profile} handle={handle} />

        {isOwn && isAdmin ? <AdminModeSettingsRow /> : null}

        <UserProfileFriendsSection
          handle={handle}
          isOwn={isOwn}
          publicFriendsListOnProfile={publicFriendsListOnProfile}
          relationshipStatus={relationship?.status}
        />

        <UserProfileActivitySections handle={handle} profile={profile} isOwn={isOwn} />
      </section>

      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <UserProfilePageBold
          profile={profile}
          handle={handle}
          isOwn={isOwn}
          relationship={relationship}
          relationshipStatus={relationship?.status}
          relLoading={relLoading}
          sendMut={sendMut}
          cancelMut={cancelMut}
          acceptMut={acceptMut}
          declineMut={declineMut}
          unfriendMut={unfriendMut}
        />
      </div>
    </>
  );
}
