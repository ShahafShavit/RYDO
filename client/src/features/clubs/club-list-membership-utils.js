/** Maps GET /clubs row to a single viewer status for list UI. */
export function getClubListMembershipStatus(club) {
  if (club.myRole === 'admin') return 'admin';
  if (club.myRole === 'organizer') return 'organizer';
  if (club.myRole === 'member') return 'member';
  if (club.myRole === 'pending' || club.membershipPending) return 'pending';
  return null;
}

/** Active member or club admin — not pending and not unaffiliated. */
export function isActiveClubMember(club) {
  const s = getClubListMembershipStatus(club);
  return s === 'member' || s === 'organizer' || s === 'admin';
}

/** Whether the viewer may schedule club rides (server-computed on list/detail). */
export function canCreateClubRide(club) {
  return Boolean(club?.viewerCanCreateRide);
}

/** Active roster visibility: member, organizer, or admin. */
export function isActiveClubMembershipStatus(membership) {
  return membership === 'member' || membership === 'organizer' || membership === 'admin';
}
