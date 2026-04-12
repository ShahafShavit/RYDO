import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, generatePath } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/app/router/route-paths';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import CreateClubRideModal from '@/features/rides/components/CreateClubRideModal';
import ClubSettingsModal from '@/features/clubs/components/ClubSettingsModal';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import Input from '@/shared/components/ui/input/Input';
import UserAvatar from '@/shared/components/user/UserAvatar';

function ridePeopleSummary(r) {
  const fromDetails = Array.isArray(r.participantDetails) ? r.participantDetails.length : 0;
  const fromParts = Array.isArray(r.participants) ? r.participants.length : 0;
  let count = 0;
  if (r.participantCount != null && r.participantCount !== '') {
    const n = Number(r.participantCount);
    if (Number.isFinite(n)) count = n;
  }
  if (count === 0) count = fromDetails || fromParts || 0;
  if (Array.isArray(r.participantDetails) && r.participantDetails.length > 0) {
    const names = r.participantDetails
      .map((p) => p.displayName?.trim() || `Rider #${p.userId}`)
      .slice(0, 4)
      .join(', ');
    const extra = r.participantDetails.length > 4 ? ` +${r.participantDetails.length - 4}` : '';
    return `${names}${extra}`;
  }
  return `${count} signed up`;
}

export default function ClubDetailPage() {
  const { clubId } = useParams();
  const id = Number(clubId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteToken, setInviteToken] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const clubQuery = useQuery({
    queryKey: ['clubs', 'detail', id],
    queryFn: () => clubsApi.getById(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  const canSeeMembers = clubQuery.data?.currentUserMembership === 'member' || clubQuery.data?.currentUserMembership === 'admin';

  const membersQuery = useQuery({
    queryKey: ['clubs', 'members', id],
    queryFn: () => clubsApi.getMembers(id),
    enabled: canSeeMembers,
  });

  const requestsQuery = useQuery({
    queryKey: ['clubs', 'join-requests', id],
    queryFn: () => clubsApi.getJoinRequests(id),
    enabled: clubQuery.data?.currentUserMembership === 'admin',
  });

  const ridesQuery = useQuery({
    queryKey: ['clubs', 'rides', id],
    queryFn: () => clubsApi.getRides(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  const invalidateClub = () => {
    queryClient.invalidateQueries({ queryKey: ['clubs'] });
    queryClient.invalidateQueries({ queryKey: ['rides', 'me'] });
    queryClient.invalidateQueries({ queryKey: ['clubs', 'rides', id] });
  };

  const joinMut = useMutation({
    mutationFn: () => clubsApi.join(id),
    onSuccess: invalidateClub,
  });

  const leaveMut = useMutation({
    mutationFn: () => clubsApi.leave(id),
    onSuccess: () => {
      invalidateClub();
    },
  });

  const redeemMut = useMutation({
    mutationFn: () => clubsApi.redeemInvite(inviteToken.trim()),
    onSuccess: () => {
      setInviteToken('');
      invalidateClub();
    },
  });

  const inviteMut = useMutation({
    mutationFn: () => clubsApi.createInvite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', 'detail', id] });
    },
  });

  const approveMut = useMutation({
    mutationFn: (userId) => clubsApi.approveRequest(id, userId),
    onSuccess: invalidateClub,
  });

  const rejectMut = useMutation({
    mutationFn: (userId) => clubsApi.rejectRequest(id, userId),
    onSuccess: invalidateClub,
  });

  const promoteMut = useMutation({
    mutationFn: (userId) => clubsApi.promote(id, userId),
    onSuccess: invalidateClub,
  });

  const demoteMut = useMutation({
    mutationFn: (userId) => clubsApi.demote(id, userId),
    onSuccess: invalidateClub,
  });

  const club = clubQuery.data;

  const [ridePartitionNowMs, setRidePartitionNowMs] = useState(() => Date.now());
  useEffect(() => {
    queueMicrotask(() => {
      setRidePartitionNowMs(Date.now());
    });
  }, [ridesQuery.data]);

  const { upcomingRides, pastRides } = useMemo(() => {
    const list = ridesQuery.data;
    if (!Array.isArray(list) || list.length === 0) return { upcomingRides: [], pastRides: [] };
    const now = ridePartitionNowMs;
    const upcoming = [];
    const past = [];
    for (const r of list) {
      const t = new Date(r.scheduledDate).getTime();
      if (Number.isNaN(t)) continue;
      if (t >= now) upcoming.push(r);
      else past.push(r);
    }
    upcoming.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    past.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
    return { upcomingRides: upcoming, pastRides: past };
  }, [ridesQuery.data, ridePartitionNowMs]);

  const membershipLabel = useMemo(() => {
    if (!club) return '';
    switch (club.currentUserMembership) {
      case 'admin':
        return '';
      case 'member':
        return 'You are a member';
      case 'pending':
        return 'Your request is pending';
      default:
        return 'You are not a member';
    }
  }, [club]);

  if (clubQuery.isError) {
    return (
      <section>
        <p className="text-red-400">Could not load this club.</p>
        <Link to={ROUTES.clubs} className="mt-4 inline-block text-[#7B5CFF]">
          Back to clubs
        </Link>
      </section>
    );
  }

  if (clubQuery.isLoading || !club) {
    return (
      <section>
        <div className="h-10 w-48 animate-pulse rounded-lg bg-white/10" />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <Link to={ROUTES.clubs} className="text-sm text-[#7B5CFF] hover:underline">
          ← Clubs
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/42">Club</p>
            <h1 className="mt-2 text-3xl font-semibold">{club.name}</h1>
            <p className="mt-2 text-white/72">{club.description}</p>
            {club.region ? <p className="mt-2 text-sm text-white/56">{club.region}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-end">
            {club.currentUserMembership === 'admin' ? (
              <div
                className="inline-flex items-center gap-0 rounded-full border border-white/12 bg-white/[0.04] p-1 pl-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                role="group"
                aria-label="Club visibility and settings"
              >
                <span
                  className={
                    club.visibility === 'private'
                      ? 'inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/18 px-3 text-sm capitalize leading-none text-violet-100/95'
                      : 'inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-emerald-400/28 bg-emerald-500/14 px-3 text-sm capitalize leading-none text-emerald-50/95'
                  }
                >
                  {club.visibility}
                </span>
                <span className="mx-1 h-4 w-px shrink-0 bg-white/18" aria-hidden />
                <Button
                  variant="neon"
                  type="button"
                  size="sm"
                  aria-label="Club settings"
                  className="cursor-pointer !h-8 !min-h-0 shrink-0 !px-3 !py-0 text-sm leading-none shadow-[0_0_16px_rgba(123,92,255,0.14)]"
                  onClick={() => setSettingsOpen(true)}
                >
                  Settings
                </Button>
              </div>
            ) : (
              <span
                className={
                  club.visibility === 'private'
                    ? 'inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-violet-400/35 bg-violet-500/15 px-3.5 text-sm capitalize leading-none text-violet-200/90'
                    : 'inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/12 px-3.5 text-sm capitalize leading-none text-emerald-100/90'
                }
              >
                {club.visibility}
              </span>
            )}
          </div>
        </div>
        {membershipLabel ? <p className="mt-3 text-sm text-white/56">{membershipLabel}</p> : null}
      </div>

      <div className="flex flex-wrap gap-3">
        {club.currentUserMembership === 'none' || club.currentUserMembership == null ? (
          <Button variant="primary" onClick={() => joinMut.mutate()} disabled={joinMut.isPending}>
            {club.visibility === 'private' ? 'Request to join' : 'Join club'}
          </Button>
        ) : null}
        {club.currentUserMembership === 'pending' ? (
          <p className="text-sm text-amber-300/90">Waiting for an admin to approve your request.</p>
        ) : null}
        {club.visibility === 'private' &&
        user &&
        (club.currentUserMembership === 'none' || club.currentUserMembership === 'pending') ? (
          <Card className="max-w-md">
            <p className="text-sm text-white/72">Have an invite code?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input value={inviteToken} onChange={(e) => setInviteToken(e.target.value)} placeholder="Invite token" />
              <Button variant="neon" onClick={() => redeemMut.mutate()} disabled={!inviteToken.trim() || redeemMut.isPending}>
                Redeem
              </Button>
            </div>
            {redeemMut.isError ? <p className="mt-2 text-xs text-red-400">Invalid or expired code.</p> : null}
          </Card>
        ) : null}
      </div>

      <Card>
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Club rides</h2>
            <p className="mt-1 max-w-xl text-sm text-white/48">
              Rides are created for this club only. Members opt in from each ride&apos;s page.
            </p>
          </div>
          {canSeeMembers ? (
            <Button
              variant="neon"
              type="button"
              className="shrink-0 !py-2.5 text-sm sm:self-start"
              onClick={() => setScheduleOpen(true)}
            >
              + Schedule a ride
            </Button>
          ) : null}
        </div>

        <h3 className="mt-6 text-sm font-semibold text-white/88">Upcoming</h3>
        {upcomingRides.length ? (
          <ul className="mt-3 space-y-3">
            {upcomingRides.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{r.name}</p>
                  <p className="text-xs text-white/56">{new Date(r.scheduledDate).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-white/48">{ridePeopleSummary(r)}</p>
                </div>
                <Link to={ROUTES.rideEvent.replace(':rideId', String(r.id))}>
                  <Button variant="secondary" className="!py-1.5 text-xs">
                    View
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-white/56">No upcoming rides.</p>
        )}

        <h3 className="mt-8 text-sm font-semibold text-white/88">Past</h3>
        {pastRides.length ? (
          <ul className="mt-3 space-y-3">
            {pastRides.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{r.name}</p>
                  <p className="text-xs text-white/56">{new Date(r.scheduledDate).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-white/48">{ridePeopleSummary(r)}</p>
                </div>
                <Link to={ROUTES.rideEvent.replace(':rideId', String(r.id))}>
                  <Button variant="secondary" className="!py-1.5 text-xs">
                    View
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-white/56">No past rides yet.</p>
        )}
      </Card>

      {canSeeMembers && membersQuery.data ? (
        <Card>
          <h2 className="text-lg font-semibold">Members</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {(membersQuery.data || []).map((m) => (
              <li
                key={m.userId}
                className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/80"
              >
                <Link
                  to={generatePath(ROUTES.userProfile, { userId: String(m.userId) })}
                  className="flex min-w-0 items-center gap-2 hover:text-white"
                >
                  <UserAvatar
                    avatarUrl={m.avatarUrl}
                    displayName={m.displayName || `User ${m.userId}`}
                    sizeClass="h-7 w-7"
                    textClass="text-[10px]"
                  />
                  <span className="truncate">{m.displayName || `User ${m.userId}`}</span>
                </Link>
                {m.role === 'admin' ? (
                  <span className="text-xs text-[#21F1A8]">Admin</span>
                ) : null}
                {club.currentUserMembership === 'admin' && m.userId !== user?.id ? (
                  <span className="ml-1 flex gap-1">
                    {m.role === 'member' ? (
                      <button type="button" className="text-xs text-[#7B5CFF]" onClick={() => promoteMut.mutate(m.userId)}>
                        Promote
                      </button>
                    ) : (
                      <button type="button" className="text-xs text-[#7B5CFF]" onClick={() => demoteMut.mutate(m.userId)}>
                        Demote
                      </button>
                    )}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {(club.currentUserMembership === 'member' || club.currentUserMembership === 'admin') && user ? (
        <div className="border-t border-white/10 pt-6">
          <Button variant="secondary" onClick={() => leaveMut.mutate()} disabled={leaveMut.isPending}>
            Leave club
          </Button>
        </div>
      ) : null}

      {club.currentUserMembership === 'admin' ? (
        <ClubSettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          clubId={id}
          club={club}
          joinRequests={requestsQuery.data}
          inviteMut={inviteMut}
          approveMut={approveMut}
          rejectMut={rejectMut}
        />
      ) : null}

      <CreateClubRideModal
        clubId={id}
        clubName={club.name}
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSuccess={invalidateClub}
      />
    </section>
  );
}
