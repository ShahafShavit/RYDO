import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import CreateClubModal from '@/features/clubs/components/CreateClubModal';
import ClubListMembershipBadge, {
  getClubListMembershipStatus,
  isActiveClubMember,
} from '@/features/clubs/components/ClubListMembershipBadge';
import RedeemClubInviteModal from '@/features/clubs/components/RedeemClubInviteModal';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import UserAvatar from '@/shared/components/user/UserAvatar';

function clubMatchesSearch(club, q) {
  if (!q) return true;
  const name = (club.name ?? '').toLowerCase();
  const desc = (club.description ?? '').toLowerCase();
  const region = (club.region ?? '').toLowerCase();
  return name.includes(q) || desc.includes(q) || region.includes(q);
}

function ClubCard({ club }) {
  const membershipStatus = getClubListMembershipStatus(club);
  return (
    <Link to={ROUTES.clubDetails.replace(':clubId', String(club.id))}>
      <Card className="h-full transition hover:border-[#7B5CFF]/35">
        <div className="flex items-start gap-3">
          <UserAvatar
            avatarUrl={club.avatarUrl}
            displayName={club.name}
            sizeClass="h-10 w-10"
            textClass="text-sm"
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 text-lg font-semibold text-white">{club.name}</h3>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <span className="rounded-full border border-white/12 px-2 py-0.5 text-xs capitalize text-white/56">
                  {club.visibility}
                </span>
                {membershipStatus ? <ClubListMembershipBadge status={membershipStatus} /> : null}
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-white/64">{club.description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function ClubsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs', 'list'],
    queryFn: () => clubsApi.list(),
  });

  const q = search.trim().toLowerCase();

  // Active member/admin → "Your clubs". Everything else (including public clubs you haven't joined,
  // private clubs you're not in, and pending) → "Other clubs", split for clarity.
  const { memberClubs, otherPublicClubs, otherPrivateClubs } = useMemo(() => {
    const filtered = clubs.filter((c) => clubMatchesSearch(c, q));
    const members = [];
    const others = [];
    for (const c of filtered) {
      if (isActiveClubMember(c)) members.push(c);
      else others.push(c);
    }
    const byName = (a, b) => a.name.localeCompare(b.name);
    members.sort(byName);
    others.sort(byName);
    const isPublic = (c) => String(c.visibility ?? '').toLowerCase() === 'public';
    const otherPublic = others.filter(isPublic);
    const otherPrivate = others.filter((c) => !isPublic(c));
    return { memberClubs: members, otherPublicClubs: otherPublic, otherPrivateClubs: otherPrivate };
  }, [clubs, q]);

  const otherClubsCount = otherPublicClubs.length + otherPrivateClubs.length;
  const showEmptySearch =
    !isLoading && clubs.length > 0 && memberClubs.length === 0 && otherClubsCount === 0;

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

      <Card className="border-white/10 bg-white/5 p-4 sm:p-5">
        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-white/45" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clubs by name, region, or description…"
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
            autoComplete="off"
            aria-label="Search clubs"
          />
        </label>
      </Card>

      {isLoading ? (
        <p className="text-sm text-white/56">Loading…</p>
      ) : clubs.length === 0 ? (
        <p className="text-sm text-white/56">No clubs yet.</p>
      ) : (
        <div className="space-y-10">
          {showEmptySearch ? (
            <p className="text-sm text-white/56">No clubs match &ldquo;{search.trim()}&rdquo;.</p>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold text-white/88">Your clubs</h2>
                <p className="mt-1 text-sm text-white/48">Where you&apos;re an active member or admin.</p>
                {memberClubs.length === 0 ? (
                  <p className="mt-4 text-sm text-white/48">
                    {q ? 'No matching clubs in this section.' : 'You are not an active member of any club yet.'}
                  </p>
                ) : (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {memberClubs.map((c) => (
                      <ClubCard key={c.id} club={c} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white/88">Other clubs</h2>
                <p className="mt-1 text-sm text-white/48">
                  Public clubs you haven&apos;t joined yet appear here, together with private clubs where you&apos;re not
                  an active member (including pending requests).
                </p>
                {otherClubsCount === 0 ? (
                  <p className="mt-4 text-sm text-white/48">
                    {q ? 'No matching clubs in this section.' : 'No other clubs to show.'}
                  </p>
                ) : (
                  <div className="mt-6 space-y-8">
                    {otherPublicClubs.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-medium text-white/72">Public — open to join</h3>
                        <div className="mt-3 grid gap-4 md:grid-cols-2">
                          {otherPublicClubs.map((c) => (
                            <ClubCard key={c.id} club={c} />
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {otherPrivateClubs.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-medium text-white/72">Private — invite or approval</h3>
                        <div className="mt-3 grid gap-4 md:grid-cols-2">
                          {otherPrivateClubs.map((c) => (
                            <ClubCard key={c.id} club={c} />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
