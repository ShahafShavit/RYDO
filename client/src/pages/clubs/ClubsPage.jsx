import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '@/app/router/route-paths';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import CreateClubModal from '@/features/clubs/components/CreateClubModal';
import RedeemClubInviteModal from '@/features/clubs/components/RedeemClubInviteModal';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';

export default function ClubsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs', 'list'],
    queryFn: () => clubsApi.list(),
  });

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">Clubs</p>
          <h1 className="mt-2 text-3xl font-semibold">Cycling clubs</h1>
          <p className="mt-2 text-sm text-white/64">
            Public clubs are open to join. Private clubs require approval or an invite.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" type="button" onClick={() => setInviteOpen(true)}>
            Have an invite code?
          </Button>
          <Button variant="neon" type="button" onClick={() => setCreateOpen(true)}>
            Create a club
          </Button>
        </div>
      </div>

      <CreateClubModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
      <RedeemClubInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />

      <div>
        <h2 className="text-lg font-semibold text-white/88">All clubs</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {isLoading ? (
            <p className="text-sm text-white/56">Loading…</p>
          ) : (
            clubs.map((c) => (
              <Link key={c.id} to={ROUTES.clubDetails.replace(':clubId', String(c.id))}>
                <Card className="h-full transition hover:border-[#7B5CFF]/35">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-white">{c.name}</h3>
                    <span className="shrink-0 rounded-full border border-white/12 px-2 py-0.5 text-xs capitalize text-white/56">
                      {c.visibility}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-white/64">{c.description}</p>
                  {c.membershipPending ? (
                    <p className="mt-3 text-xs text-amber-300/90">Membership pending approval</p>
                  ) : null}
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
