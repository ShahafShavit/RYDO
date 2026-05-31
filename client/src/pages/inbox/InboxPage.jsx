import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Inbox as InboxIcon } from 'lucide-react';
import { generatePath, Link, useNavigate } from 'react-router-dom';
import { userProfilePath } from '@/shared/lib/user-paths';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import { rideInvitesApi } from '@/features/rides/api/ride-invites-api';
import { friendsApi } from '@/features/social/api/friends-api';
import InboxPageBold from '@/features/social/components/InboxPageBold';
import InboxTabs from '@/features/social/components/InboxTabs';
import { inboxKeys, useInbox } from '@/features/social/hooks/useInbox';
import { inboxSummaryKeys, useInboxSummary } from '@/features/social/hooks/useInboxSummary';
import { relationshipKeys } from '@/features/social/hooks/useRelationship';
import { ROUTES } from '@/app/router/route-paths';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import UserAvatar from '@/shared/components/user/UserAvatar';

const TAB_EMPTY = {
  friends: 'No friend requests yet.',
  rides: 'No ride invites or club ride updates yet.',
  club: 'No club join requests yet.',
};

export default function InboxPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('friends');
  const { data, isLoading, isError, error } = useInbox({ tab: activeTab, take: 50 });
  const { data: summary } = useInboxSummary();

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

  const approveClubMut = useMutation({
    mutationFn: ({ clubId, userId }) => clubsApi.approveRequest(clubId, userId),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['clubs', 'members', v.clubId] });
      queryClient.invalidateQueries({ queryKey: ['clubs', 'detail', v.clubId] });
    },
  });

  const rejectClubMut = useMutation({
    mutationFn: ({ clubId, userId }) => clubsApi.rejectRequest(clubId, userId),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['clubs', 'members', v.clubId] });
    },
  });

  const acceptRideInviteMut = useMutation({
    mutationFn: ({ rideId, inviteId }) => rideInvitesApi.acceptInvite(rideId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['rides'] });
    },
  });

  const declineRideInviteMut = useMutation({
    mutationFn: ({ rideId, inviteId }) => rideInvitesApi.declineInvite(rideId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
    },
  });

  const markReadMut = useMutation({
    mutationFn: (inboxItemId) => friendsApi.markInboxRead(inboxItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const tabCounts = useMemo(
    () => ({
      friends: summary?.friendUnread ?? 0,
      rides: summary?.rideUnread ?? 0,
      club: summary?.clubUnread ?? 0,
    }),
    [summary],
  );

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
  }, [items, activeTab, queryClient]);

  const rideInviteBusy = acceptRideInviteMut.isPending || declineRideInviteMut.isPending;

  const renderRow = (row) => {
    if (row.kind === 'friend_request' && row.friendRequest) {
      const fr = row.friendRequest;
      const from = fr.fromUser;
      const pending = fr.status === 'pending' && !row.resolvedAt;
      const profileHref = userProfilePath(from.handle);
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

    if (row.kind === 'club_join_request' && row.clubJoinRequest) {
      const cjr = row.clubJoinRequest;
      const club = cjr.club;
      const requester = cjr.requester;
      const pending = !row.resolvedAt;
      const profileHref = userProfilePath(requester.handle);
      const clubHref = generatePath(ROUTES.clubDetails, { clubId: String(club.id) });
      const clubBusy = approveClubMut.isPending || rejectClubMut.isPending;
      return (
        <li key={row.id}>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1">
                <Link to={profileHref} className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    avatarUrl={requester.avatarUrl}
                    displayName={requester.fullName}
                    sizeClass="h-11 w-11"
                    textClass="text-sm"
                  />
                  <span className="font-medium text-fg">{requester.fullName || 'Member'}</span>
                </Link>
                <span className="text-fg-muted">requested to join</span>
                <Link
                  to={clubHref}
                  className="font-medium text-rydo-purple underline-offset-4 hover:underline"
                >
                  {club.name}
                </Link>
                <p className="w-full text-xs text-fg-muted">
                  {pending ? 'Approve or decline this request.' : 'Resolved.'}
                </p>
              </div>
              {pending ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    className="min-w-[88px]"
                    disabled={clubBusy}
                    onClick={() => approveClubMut.mutate({ clubId: club.id, userId: requester.id })}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-w-[88px]"
                    disabled={clubBusy}
                    onClick={() => rejectClubMut.mutate({ clubId: club.id, userId: requester.id })}
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

    if (row.kind === 'ride_invite' && row.rideInvite) {
      const ri = row.rideInvite;
      const from = ri.fromUser;
      const ride = ri.ride;
      const pending = ri.status === 'pending' && !row.resolvedAt;
      const profileHref = userProfilePath(from?.handle);
      const rideHref = generatePath(ROUTES.rideEvent, { rideId: String(ride?.id ?? '') });
      return (
        <li key={row.id}>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Link to={profileHref} className="flex min-w-0 flex-1 items-center gap-3">
                <UserAvatar
                  avatarUrl={from?.avatarUrl}
                  displayName={from?.fullName}
                  sizeClass="h-11 w-11"
                  textClass="text-sm"
                />
                <div className="min-w-0">
                  <p className="font-medium text-fg">
                    <span className="text-fg-muted">Ride invite from </span>
                    {from?.fullName || 'Member'}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {ride?.name ? `"${ride.name}"` : 'Personal ride'}
                    {pending ? ' — waiting for your response.' : ' — resolved.'}
                  </p>
                </div>
              </Link>
              {pending ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    className="min-w-[88px]"
                    disabled={rideInviteBusy}
                    onClick={() => acceptRideInviteMut.mutate({ rideId: ride.id, inviteId: ri.id })}
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-w-[88px]"
                    disabled={rideInviteBusy}
                    onClick={() => declineRideInviteMut.mutate({ rideId: ride.id, inviteId: ri.id })}
                  >
                    Decline
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="secondary" onClick={() => navigate(rideHref)}>
                  View ride
                </Button>
              )}
            </div>
          </Card>
        </li>
      );
    }

    if (row.kind === 'club_ride_announced' && row.clubRideAnnounced) {
      const ann = row.clubRideAnnounced;
      const ride = ann.ride;
      const club = ann.club;
      const rideHref = generatePath(ROUTES.rideEvent, { rideId: String(ride?.id ?? '') });
      const creator = ann.createdBy;
      return (
        <li key={row.id}>
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-fg">New club ride</p>
                <p className="mt-1 text-sm text-fg-muted">
                  <span className="font-semibold text-fg/90">{club?.name}</span>
                  {ride?.name ? ` — ${ride.name}` : null}
                </p>
                {creator?.fullName ? (
                  <p className="mt-1 text-xs text-fg-muted">Scheduled by {creator.fullName}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  if (!row.readAt) markReadMut.mutate(row.id);
                  navigate(rideHref);
                }}
              >
                View ride
              </Button>
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
  };

  return (
    <>
      <section className="hidden space-y-6 md:block">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface-strong text-fg-muted">
              <InboxIcon className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-fg">Inbox</h1>
              <p className="mt-1 text-sm text-fg-muted">Friends, ride invites, and club requests.</p>
            </div>
          </div>
        </div>

        <InboxTabs activeTab={activeTab} onTabChange={setActiveTab} counts={tabCounts} />

        {isLoading ? <p className="text-fg-muted">Loading…</p> : null}
        {isError ? (
          <p className="text-sm text-red-400">{error?.message || 'Could not load inbox.'}</p>
        ) : null}

        {!isLoading && !isError && items.length === 0 ? (
          <Card className="p-8 text-center text-fg-muted">{TAB_EMPTY[activeTab]}</Card>
        ) : null}

        <ul className="space-y-3">{!isLoading && !isError ? items.map(renderRow) : null}</ul>
      </section>

      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <InboxPageBold
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabCounts={tabCounts}
          items={items}
          isLoading={isLoading}
          isError={isError}
          error={error}
          acceptMut={acceptMut}
          declineMut={declineMut}
          approveClubMut={approveClubMut}
          rejectClubMut={rejectClubMut}
          acceptRideInviteMut={acceptRideInviteMut}
          declineRideInviteMut={declineRideInviteMut}
          markReadMut={markReadMut}
        />
      </div>
    </>
  );
}
