import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { leaderboardRankRowClass } from '@/features/leaderboards/leaderboard-boards';
import { formatLeaderboardValue } from '@/features/leaderboards/leaderboard-format';
import { leaderboardProfileLinkState } from '@/features/leaderboards/leaderboard-utils';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { cn } from '@/shared/lib/cn';

export default function LeaderboardRankList({
  rows,
  formatKm,
  formatElevation,
  currentUserId,
  boardId,
  maxRows,
  className,
}) {
  const rest = rows.slice(3);
  const visible = maxRows != null ? rest.slice(0, maxRows) : rest;

  if (visible.length === 0 && rows.length === 0) {
    return <p className="rydo-subtle px-2 text-sm">No data yet.</p>;
  }

  if (visible.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {visible.map((row) => {
        const isMe = currentUserId != null && Number(row.userId) === Number(currentUserId);
        const accent = leaderboardRankRowClass(row.rank);
        return (
          <Link
            key={`${row.userId}-${row.rank}`}
            to={ROUTES.userProfile.replace(':userId', String(row.userId))}
            state={leaderboardProfileLinkState(boardId)}
            className={cn(
              'rydo-panel flex items-center gap-3 px-3.5 py-2.5 no-underline transition active:opacity-80',
              isMe &&
                'border-transparent bg-gradient-to-r from-[rgba(33,241,168,0.12)] to-[rgba(123,92,255,0.16)]',
              !isMe && accent,
            )}
          >
            <span className="rydo-tnum w-5 text-center text-sm font-extrabold text-fg-subtle">
              {row.rank}
            </span>
            <UserAvatar
              avatarUrl={row.avatarUrl}
              displayName={row.displayName}
              sizeClass="h-9 w-9"
              textClass="text-xs"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-fg">
                {isMe ? 'You' : row.displayName}
              </p>
            </div>
            <span className="rydo-tnum text-sm font-bold text-fg">
              {formatLeaderboardValue(row, formatKm, formatElevation)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
