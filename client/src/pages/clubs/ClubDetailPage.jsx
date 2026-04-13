import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/app/router/route-paths';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import CreateClubRideModal from '@/features/rides/components/CreateClubRideModal';
import ClubSettingsModal from '@/features/clubs/components/ClubSettingsModal';
import ClubMemberChip from '@/features/clubs/components/ClubMemberChip';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Card from '@/shared/components/ui/card/Card';
import UserAvatar from '@/shared/components/user/UserAvatar';
import Button from '@/shared/components/ui/button/Button';
import Input from '@/shared/components/ui/input/Input';
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

/** Admins → active members → pending; then display name A–Z (aligned with API). */
function compareClubMembers(a, b) {
  const tier = (m) => {
    if (m.membershipStatus === 'pending') return 2;
    if (m.role === 'admin') return 0;
    return 1;
  };
  const d = tier(a) - tier(b);
  if (d !== 0) return d;
  const na = (a.displayName || `User ${a.userId}`).trim().toLowerCase();
  const nb = (b.displayName || `User ${b.userId}`).trim().toLowerCase();
  return na.localeCompare(nb, undefined, { sensitivity: 'base' });
}

export default function ClubDetailPage() {
  const { clubId } = useParams();
  const id = Number(clubId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteToken, setInviteToken] = useState('');
  const [inviteRedeemOpen, setInviteRedeemOpen] = useState(false);
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
      setInviteRedeemOpen(false);
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

  const removeMut = useMutation({
    mutationFn: (userId) => clubsApi.removeMember(id, userId),
    onSuccess: invalidateClub,
  });

  const club = clubQuery.data;

  const [ridePartitionNowMs, setRidePartitionNowMs] = useState(() => Date.now());
  useEffect(() => {
    queueMicrotask(() => {
      setRidePartitionNowMs(Date.now());
    });
  }, [ridesQuery.data]);

  const rideSummary = useMemo(() => {
    const raw = ridesQuery.data;
    if (!raw || Array.isArray(raw)) return null;
    if (raw.summaryOnly)
      return {
        upcomingCount: Number(raw.upcomingCount) || 0,
        pastCount: Number(raw.pastCount) || 0,
      };
    return null;
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

  const sortedMembers = useMemo(() => {
    const raw = membersQuery.data;
    if (!Array.isArray(raw)) return [];
    return [...raw].sort(compareClubMembers);
  }, [membersQuery.data]);

  if (clubQuery.isError) {
    return (
      <section>
        <p className="text-red-400">Could not load this club.</p>
        <Link to={ROUTES.clubs} className="mt-4 inline-block text-rydo-purple">
          Back to clubs
        </Link>
      </section>
    );
  }

  if (clubQuery.isLoading || !club) {
    return (
      <section>
        <div className="h-10 w-48 animate-pulse rounded-lg bg-surface-strong" />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to={ROUTES.clubs} className="text-sm text-rydo-purple hover:underline">
            ← Clubs
          </Link>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-initial">
            {club.currentUserMembership === 'admin' ? (
              <div
                className="inline-flex items-center gap-0 rounded-full border border-border bg-surface p-1 pl-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                role="group"
                aria-label="Club visibility and settings"
              >
                <span
                  className={
                    club.visibility === 'private'
                      ? 'inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-rydo-purple/35 bg-rydo-purple/16 px-3 text-sm capitalize leading-none text-fg'
                      : 'inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-rydo-green/30 bg-rydo-green/14 px-3 text-sm capitalize leading-none text-fg'
                  }
                >
                  {club.visibility}
                </span>
                <span className="mx-1 h-4 w-px shrink-0 bg-border-strong" aria-hidden />
                <Button
                  variant="neon"
                  type="button"
                  size="sm"
                  aria-label="Club settings"
                  className="cursor-pointer !h-8 !min-h-0 shrink-0 !px-3 !py-0 text-sm leading-none shadow-[0_0_16px_color-mix(in_srgb,var(--rydo-purple)_22%,transparent)]"
                  onClick={() => setSettingsOpen(true)}
                >
                  Settings
                </Button>
              </div>
            ) : (
              <>
                <span
                  className={
                    club.visibility === 'private'
                      ? 'inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-rydo-purple/35 bg-rydo-purple/14 px-3.5 text-sm capitalize leading-none text-fg'
                      : 'inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-rydo-green/28 bg-rydo-green/12 px-3.5 text-sm capitalize leading-none text-fg'
                  }
                >
                  {club.visibility}
                </span>
                {user && (club.currentUserMembership === 'none' || club.currentUserMembership == null) ? (
                  <Button
                    variant="primary"
                    type="button"
                    size="sm"
                    className="!h-9 shrink-0 cursor-pointer"
                    onClick={() => joinMut.mutate()}
                    disabled={joinMut.isPending}
                  >
                    {club.visibility === 'private' ? 'Request to join' : 'Join club'}
                  </Button>
                ) : null}
                {club.currentUserMembership === 'pending' ? (
                  <span className="inline-flex h-9 items-center rounded-full border border-amber-400/35 bg-amber-950/35 px-3 text-xs font-medium text-amber-100/95">
                    Request pending
                  </span>
                ) : null}
                {club.visibility === 'private' &&
                user &&
                (club.currentUserMembership === 'none' ||
                  club.currentUserMembership == null ||
                  club.currentUserMembership === 'pending') ? (
                  <Button
                    variant="secondary"
                    type="button"
                    size="sm"
                    className="!h-9 shrink-0 cursor-pointer"
                    aria-expanded={inviteRedeemOpen}
                    onClick={() => setInviteRedeemOpen((o) => !o)}
                  >
                    {inviteRedeemOpen ? 'Close' : 'Invite code'}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>

        {inviteRedeemOpen &&
        club.currentUserMembership !== 'admin' &&
        club.visibility === 'private' &&
        user &&
        (club.currentUserMembership === 'none' ||
          club.currentUserMembership == null ||
          club.currentUserMembership === 'pending') ? (
          <div className="mt-3 flex w-full flex-col gap-2 rounded-2xl border border-border bg-surface p-3 sm:ml-auto sm:max-w-md">
            <div className="flex flex-wrap items-stretch gap-2 sm:items-center">
              <Input
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                placeholder="Invite token"
                className="min-w-[10rem] flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inviteToken.trim()) redeemMut.mutate();
                }}
              />
              <Button
                variant="neon"
                type="button"
                size="sm"
                className="shrink-0 cursor-pointer"
                onClick={() => redeemMut.mutate()}
                disabled={!inviteToken.trim() || redeemMut.isPending}
              >
                Redeem
              </Button>
            </div>
            {redeemMut.isError ? <p className="text-xs text-red-400">Invalid or expired code.</p> : null}
          </div>
        ) : null}

        <div className="mt-4 flex min-w-0 flex-wrap items-center gap-4">
          <UserAvatar
            avatarUrl={club.avatarUrl}
            displayName={club.name}
            sizeClass="h-14 w-14"
            textClass="text-lg"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Club</p>
            <h1 className="mt-2 text-3xl font-semibold">{club.name}</h1>
            {club.description ? <p className="mt-2 text-fg-muted">{club.description}</p> : null}
            {club.region ? <p className="mt-2 text-sm text-fg-muted">{club.region}</p> : null}
          </div>
        </div>
      </div>

      <Card>
        {canSeeMembers ? (
          <div className="mb-5 border-b border-border pb-5">
            <Button
              variant="neon"
              type="button"
              className="w-full cursor-pointer py-2.5! text-sm"
              onClick={() => setScheduleOpen(true)}
            >
              + Ride!
            </Button>
          </div>
        ) : null}

        {ridesQuery.isLoading ? (
          <div className="mt-6 h-24 animate-pulse rounded-2xl bg-surface-strong" />
        ) : rideSummary ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface px-5 py-4">
              <p className="text-3xl font-semibold tabular-nums text-fg">{rideSummary.upcomingCount}</p>
              <p className="mt-1 text-sm text-fg-muted">Upcoming events</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface px-5 py-4">
              <p className="text-3xl font-semibold tabular-nums text-fg">{rideSummary.pastCount}</p>
              <p className="mt-1 text-sm text-fg-muted">Past rides</p>
            </div>
          </div>
        ) : (
          <>
            <h3 className="mt-6 text-sm font-semibold text-fg/90">Upcoming</h3>
            {upcomingRides.length ? (
              <ul className="mt-3 space-y-3">
                {upcomingRides.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-fg">{r.name}</p>
                      <p className="text-xs text-fg-muted">{new Date(r.scheduledDate).toLocaleString()}</p>
                      <p className="mt-1 text-xs text-fg-subtle">{ridePeopleSummary(r)}</p>
                    </div>
                    <Link to={ROUTES.rideEvent.replace(':rideId', String(r.id))}>
                      <Button variant="secondary" className="cursor-pointer !py-1.5 text-xs">
                        View
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-fg-muted">No upcoming rides.</p>
            )}

            <h3 className="mt-8 text-sm font-semibold text-fg/90">Past</h3>
            {pastRides.length ? (
              <ul className="mt-3 space-y-3">
                {pastRides.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-fg">{r.name}</p>
                      <p className="text-xs text-fg-muted">{new Date(r.scheduledDate).toLocaleString()}</p>
                      <p className="mt-1 text-xs text-fg-subtle">{ridePeopleSummary(r)}</p>
                    </div>
                    <Link to={ROUTES.rideEvent.replace(':rideId', String(r.id))}>
                      <Button variant="secondary" className="cursor-pointer !py-1.5 text-xs">
                        View
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-fg-muted">No past rides yet.</p>
            )}
          </>
        )}
      </Card>

      {canSeeMembers && membersQuery.data ? (
        <Card className="relative z-10">
          <h2 className="text-lg font-semibold">Members</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {sortedMembers.map((m) => (
              <ClubMemberChip
                key={`${m.userId}-${m.membershipStatus || 'active'}`}
                member={m}
                viewerUserId={user?.id}
                isClubAdmin={club.currentUserMembership === 'admin'}
                approveMut={approveMut}
                rejectMut={rejectMut}
                promoteMut={promoteMut}
                demoteMut={demoteMut}
                removeMut={removeMut}
              />
            ))}
          </ul>
        </Card>
      ) : null}

      {(club.currentUserMembership === 'member' || club.currentUserMembership === 'admin') && user ? (
        <div className="relative z-0 border-t border-border pt-6">
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
          inviteMut={inviteMut}
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
