import { LEADERBOARD_BOARD_CONFIG } from '@/features/leaderboards/leaderboard-boards';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import LeaderboardPodium from '@/features/leaderboards/components/LeaderboardPodium';
import LeaderboardRankList from '@/features/leaderboards/components/LeaderboardRankList';

export default function LeaderboardBoardPanel({
  boardId,
  rows = [],
  formatKm,
  formatElevation,
  currentUserId,
  compact = false,
  maxListRows,
  showTitle = true,
}) {
  const cfg = LEADERBOARD_BOARD_CONFIG[boardId];

  return (
    <div className="flex min-w-0 flex-col">
      {showTitle ? (
        <div className="text-center">
          <Eyebrow>{cfg?.title}</Eyebrow>
          <p className="rydo-subtle mt-0.5 text-[11px] font-semibold">{cfg?.subtitle}</p>
        </div>
      ) : null}
      <LeaderboardPodium
        rows={rows}
        formatKm={formatKm}
        formatElevation={formatElevation}
        currentUserId={currentUserId}
        compact={compact}
      />
      <LeaderboardRankList
        rows={rows}
        formatKm={formatKm}
        formatElevation={formatElevation}
        currentUserId={currentUserId}
        maxRows={maxListRows}
        className={compact ? 'mt-2' : 'mt-3'}
      />
    </div>
  );
}
