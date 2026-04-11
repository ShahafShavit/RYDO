import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/app/router/route-paths';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import Input from '@/shared/components/ui/input/Input';
export default function ClubDetailPage() {
  const { clubId } = useParams();
  const id = Number(clubId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteToken, setInviteToken] = useState('');

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
    queryClient.invalidateQueries({ queryKey: ['rides', 'groups'] });
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

  const membershipLabel = useMemo(() => {
    if (!club) return '';
    switch (club.currentUserMembership) {
      case 'admin':
        return 'You are an admin';
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
          <span className="rounded-full border border-white/15 px-3 py-1 text-sm capitalize text-white/72">
            {club.visibility}
          </span>
        </div>
        <p className="mt-3 text-sm text-white/56">{membershipLabel}</p>
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
        {(club.currentUserMembership === 'member' || club.currentUserMembership === 'admin') && user ? (
          <Button variant="secondary" onClick={() => leaveMut.mutate()} disabled={leaveMut.isPending}>
            Leave club
          </Button>
        ) : null}
        {club.visibility === 'private' && club.currentUserMembership === 'none' ? (
          <Card className="max-w-md">
            <p className="text-sm text-white/72">Have an invite code?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input value={inviteToken} onChange={(e) => setInviteToken(e.target.value)} placeholder="Invite token" />
              <Button variant="neon" onClick={() => redeemMut.mutate()} disabled={!inviteToken.trim() || redeemMut.isPending}>
                Redeem
              </Button>
            </div>
          </Card>
        ) : null}
      </div>

      {club.currentUserMembership === 'admin' ? (
        <Card>
          <h2 className="text-lg font-semibold">Admin</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => inviteMut.mutate()} disabled={inviteMut.isPending}>
              {inviteMut.isPending ? 'Creating…' : 'Create invite code'}
            </Button>
            {inviteMut.data?.inviteCode ? (
              <p className="text-sm text-white/72">
                Code: <span className="font-mono text-white">{inviteMut.data.inviteCode}</span>
              </p>
            ) : null}
          </div>

          {requestsQuery.data?.length ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white/88">Pending requests</h3>
              <ul className="mt-3 space-y-2">
                {(requestsQuery.data || []).map((r) => (
                  <li key={r.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span>{r.displayName || `User #${r.userId}`}</span>
                    <div className="flex gap-2">
                      <Button variant="neon" className="!py-1.5 text-xs" onClick={() => approveMut.mutate(r.userId)}>
                        Approve
                      </Button>
                      <Button variant="secondary" className="!py-1.5 text-xs" onClick={() => rejectMut.mutate(r.userId)}>
                        Reject
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}

      {canSeeMembers && membersQuery.data ? (
        <Card>
          <h2 className="text-lg font-semibold">Members</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {(membersQuery.data || []).map((m) => (
              <li
                key={m.userId}
                className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/80"
              >
                {m.displayName || `User ${m.userId}`}
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

      <Card>
        <h2 className="text-lg font-semibold">Club rides</h2>
        {ridesQuery.data?.length ? (
          <ul className="mt-4 space-y-3">
            {ridesQuery.data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="font-medium text-white">{r.name}</p>
                  <p className="text-xs text-white/56">{new Date(r.scheduledDate).toLocaleString()}</p>
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
          <p className="mt-3 text-sm text-white/56">No rides linked to this club yet.</p>
        )}
        <div className="mt-6">
          <Link to={`${ROUTES.rideGroups}?club=${id}`}>
            <Button variant="neon">Schedule a club ride</Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}
