import { isActiveClubMember } from '@/features/clubs/club-list-membership-utils';

export function clubMatchesSearch(club, q) {
  if (!q) return true;
  const name = (club.name ?? '').toLowerCase();
  const desc = (club.description ?? '').toLowerCase();
  const region = (club.region ?? '').toLowerCase();
  return name.includes(q) || desc.includes(q) || region.includes(q);
}

export function filterClubsForExplore(clubs, query) {
  const q = query.trim().toLowerCase();
  const filtered = clubs.filter((c) => clubMatchesSearch(c, q));
  const byName = (a, b) => a.name.localeCompare(b.name);
  filtered.sort(byName);
  return filtered;
}

export function splitMemberAndDiscoverClubs(clubs) {
  const members = [];
  const others = [];
  for (const c of clubs) {
    if (isActiveClubMember(c)) members.push(c);
    else others.push(c);
  }
  const byName = (a, b) => a.name.localeCompare(b.name);
  members.sort(byName);
  others.sort(byName);
  const isPublic = (c) => String(c.visibility ?? '').toLowerCase() === 'public';
  return {
    memberClubs: members,
    otherPublicClubs: others.filter(isPublic),
    otherPrivateClubs: others.filter((c) => !isPublic(c)),
  };
}
