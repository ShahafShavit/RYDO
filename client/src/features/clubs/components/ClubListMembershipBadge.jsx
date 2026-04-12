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

const STYLES = {
  pending: 'border-border text-amber-200/90',
  member: 'border-border text-emerald-200/88',
  admin: 'border-border text-rydo-green/95',
};

const LABELS = {
  pending: 'Pending',
  member: 'Member',
  admin: 'Admin',
};

export default function ClubListMembershipBadge({ status }) {
  if (!status) return null;
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
