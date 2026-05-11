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
