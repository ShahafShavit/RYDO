import Card from '@/shared/components/ui/card/Card';

export default function RideMembersList({ members = [] }) {
  return (
    <Card>
      <h3 className="text-lg font-semibold">Ride members</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {members.length === 0 ? (
          <p className="text-sm text-white/56">No participants yet.</p>
        ) : (
          members.map((member) => (
            <span
              key={member.userId}
              className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/72"
            >
              {member.displayName?.trim() || `Rider #${member.userId}`}
            </span>
          ))
        )}
      </div>
    </Card>
  );
}
