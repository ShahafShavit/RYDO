/** Maps GET /clubs row to a single viewer status for list UI. */
export function getClubListMembershipStatus(club) {
  if (club.myRole === 'admin') return 'admin';
  if (club.myRole === 'member') return 'member';
  if (club.myRole === 'pending' || club.membershipPending) return 'pending';
  return null;
}

/** Active member or club admin — not pending and not unaffiliated. */
export function isActiveClubMember(club) {
  const s = getClubListMembershipStatus(club);
  return s === 'member' || s === 'admin';
}
