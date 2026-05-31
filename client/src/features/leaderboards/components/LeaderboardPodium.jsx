import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { LB_RING, formatLeaderboardValue } from '@/features/leaderboards/leaderboard-format';
import { leaderboardProfileLinkState } from '@/features/leaderboards/leaderboard-utils';
import { cn } from '@/shared/lib/cn';

function PodiumCol({ row, lift, formatKm, formatElevation, currentUserId, boardId, compact = false }) {
  const ring = LB_RING[row.rank];
  const isMe = currentUserId != null && Number(row.userId) === Number(currentUserId);
  const label = isMe ? 'You' : (row.displayName || '').split(' ')[0];
  const profileTo = ROUTES.userProfile.replace(':userId', String(row.userId));

  const avatarSize = compact
    ? row.rank === 1
      ? 'h-[52px] w-[52px]'
      : 'h-[44px] w-[44px]'
    : row.rank === 1
      ? 'h-[60px] w-[60px]'
      : 'h-[50px] w-[50px]';
  const textSize = compact
    ? row.rank === 1
      ? 'text-lg'
      : 'text-sm'
    : row.rank === 1
      ? 'text-xl'
      : 'text-base';

  return (
    <Link
      to={profileTo}
      state={leaderboardProfileLinkState(boardId)}
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl px-1 py-1 no-underline transition active:opacity-80',
        'min-w-[88px] touch-manipulation',
      )}
      style={{ paddingBottom: lift }}
      aria-label={`${label}, rank ${row.rank}`}
    >
      <div className="relative">
        <div
          className="rounded-full"
          style={{
            boxShadow: `0 0 0 2.5px ${ring}, 0 0 24px ${ring.replace('0.9', '0.4').replace('0.95', '0.4')}`,
          }}
        >
          <UserAvatar
            avatarUrl={row.avatarUrl}
            displayName={row.displayName}
            sizeClass={avatarSize}
            textClass={textSize}
          />
        </div>
        <span
          className="absolute -bottom-1.5 left-1/2 flex h-[22px] w-[22px] -translate-x-1/2 items-center justify-center rounded-full bg-[#141414] text-xs font-extrabold"
          style={{ boxShadow: `0 0 0 2px ${ring}`, color: ring }}
        >
          {row.rank}
        </span>
      </div>
      <div className="mt-1 max-w-[96px] text-center">
        <p className="truncate text-xs font-bold text-fg">{label}</p>
        <p className="rydo-tnum mt-0.5 bg-gradient-to-r from-[var(--rydo-green-bright)] to-rydo-purple bg-clip-text text-[13px] font-extrabold text-transparent">
          {formatLeaderboardValue(row, formatKm, formatElevation)}
        </p>
      </div>
    </Link>
  );
}

export default function LeaderboardPodium({
  rows,
  formatKm,
  formatElevation,
  currentUserId,
  boardId,
  compact = false,
}) {
  const top3 = rows.slice(0, 3);
  if (top3.length < 3) return null;

  return (
    <div className="flex items-end justify-center gap-1.5 px-2 pt-2">
      <PodiumCol
        row={top3[1]}
        lift={compact ? 14 : 18}
        formatKm={formatKm}
        formatElevation={formatElevation}
        currentUserId={currentUserId}
        boardId={boardId}
        compact={compact}
      />
      <PodiumCol
        row={top3[0]}
        lift={0}
        formatKm={formatKm}
        formatElevation={formatElevation}
        currentUserId={currentUserId}
        boardId={boardId}
        compact={compact}
      />
      <PodiumCol
        row={top3[2]}
        lift={compact ? 20 : 26}
        formatKm={formatKm}
        formatElevation={formatElevation}
        currentUserId={currentUserId}
        boardId={boardId}
        compact={compact}
      />
    </div>
  );
}
