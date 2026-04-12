import { Link, generatePath } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import Card from '@/shared/components/ui/card/Card';
import UserAvatar from '@/shared/components/user/UserAvatar';

export default function RideMembersList({ members = [], participantCount = 0 }) {
  const count = members.length > 0 ? members.length : participantCount;
  return (
    <Card>
      <h3 className="text-lg font-semibold">Ride members</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {members.length === 0 && count > 0 ? (
          <p className="text-sm text-fg-muted">
            {count} {count === 1 ? 'person has' : 'people have'} signed up. Full roster is visible to club members.
          </p>
        ) : null}
        {members.length === 0 && count === 0 ? (
          <p className="text-sm text-fg-muted">No participants yet.</p>
        ) : null}
        {members.map((member) => (
          <Link
            key={member.userId}
            to={generatePath(ROUTES.userProfile, { userId: String(member.userId) })}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-fg-muted transition hover:border-border-strong hover:text-fg"
          >
            <UserAvatar
              avatarUrl={member.avatarUrl}
              displayName={member.displayName?.trim() || `Rider #${member.userId}`}
              sizeClass="h-7 w-7"
              textClass="text-[10px]"
            />
            {member.displayName?.trim() || `Rider #${member.userId}`}
          </Link>
        ))}
      </div>
    </Card>
  );
}
