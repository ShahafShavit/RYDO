import { Link } from 'react-router-dom';
import { Sparkles, TrendingUp } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import { formatLeaderboardValue } from '@/features/leaderboards/leaderboard-format';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { cn } from '@/shared/lib/cn';

/**
 * @param {{
 *   row?: { rank: number, userId: number, displayName: string, avatarUrl?: string | null, value: number, unit: string } | null,
 *   leaderRow?: { rank: number, value: number, unit: string } | null,
 *   formatKm: (n: number, d?: number) => string,
 *   formatElevation: (n: number, d?: number) => string,
 *   boardTitle?: string,
 *   className?: string,
 * }} props
 */
export default function LeaderboardYourStanding({
  row,
  leaderRow,
  formatKm,
  formatElevation,
  boardTitle,
  className,
}) {
  if (!row) {
    return (
      <div className={cn('rydo-panel px-4 py-3.5 text-center', className)}>
        <Sparkles className="mx-auto h-5 w-5 text-[var(--rydo-amber)]" aria-hidden />
        <p className="mt-2 text-sm font-bold text-fg">Not on this board yet</p>
        <p className="rydo-subtle mt-1 text-xs leading-snug">
          Log more {boardTitle?.toLowerCase() || 'activity'} to climb the ranks.
        </p>
        <Link
          to={ROUTES.myRides}
          className="mt-3 inline-flex text-xs font-semibold text-rydo-purple no-underline"
        >
          Plan your next ride →
        </Link>
      </div>
    );
  }

  const gap =
    leaderRow && row.rank > 1 && row.unit === leaderRow.unit
      ? Math.max(0, leaderRow.value - row.value)
      : null;

  const isPodium = row.rank <= 3;

  return (
    <div
      className={cn(
        'rydo-bold-glass-row flex items-center gap-3 px-3.5 py-3',
        isPodium && 'border-amber-500/30',
        className,
      )}
    >
      <UserAvatar
        avatarUrl={row.avatarUrl}
        displayName={row.displayName}
        sizeClass="h-11 w-11"
        textClass="text-sm"
        className={isPodium ? 'ring-2 ring-[var(--rydo-amber)]/60' : 'ring-2 ring-rydo-purple/40'}
      />
      <div className="min-w-0 flex-1">
        <Eyebrow>{isPodium ? 'You made the podium' : 'Your standing'}</Eyebrow>
        <p className="mt-1 text-sm font-bold text-fg">
          #{row.rank} · {formatLeaderboardValue(row, formatKm, formatElevation)}
        </p>
        {gap != null && gap > 0 ? (
          <p className="rydo-subtle mt-0.5 flex items-center gap-1 text-[11px]">
            <TrendingUp className="h-3 w-3 shrink-0 text-[var(--rydo-green-bright)]" aria-hidden />
            {formatLeaderboardValue({ ...row, value: gap }, formatKm, formatElevation)} to #1
          </p>
        ) : isPodium ? (
          <p className="rydo-subtle mt-0.5 text-[11px]">Top of the pack — keep it rolling.</p>
        ) : null}
      </div>
      {isPodium ? (
        <span className="rydo-pill rydo-pill-accent shrink-0 !text-[10px] !font-bold">Top 3</span>
      ) : null}
    </div>
  );
}
