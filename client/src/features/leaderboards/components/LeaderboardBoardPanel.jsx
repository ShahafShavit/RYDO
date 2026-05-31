import { LEADERBOARD_BOARD_CONFIG } from '@/features/leaderboards/leaderboard-boards';
import { findUserLeaderboardRow } from '@/features/leaderboards/leaderboard-utils';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import LeaderboardPodium from '@/features/leaderboards/components/LeaderboardPodium';
import LeaderboardRankList from '@/features/leaderboards/components/LeaderboardRankList';
import LeaderboardYourStanding from '@/features/leaderboards/components/LeaderboardYourStanding';

export default function LeaderboardBoardPanel({
  boardId,
  rows = [],
  formatKm,
  formatElevation,
  currentUserId,
  compact = false,
  maxListRows,
  showTitle = true,
  showYourStanding = false,
}) {
  const cfg = LEADERBOARD_BOARD_CONFIG[boardId];
  const userRow = findUserLeaderboardRow(rows, currentUserId);
  const leaderRow = rows[0] ?? null;

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
        boardId={boardId}
        compact={compact}
      />
      <LeaderboardRankList
        rows={rows}
        formatKm={formatKm}
        formatElevation={formatElevation}
        currentUserId={currentUserId}
        boardId={boardId}
        maxRows={maxListRows}
        className={compact ? 'mt-2' : 'mt-3'}
      />
      {showYourStanding ? (
        <LeaderboardYourStanding
          row={userRow}
          leaderRow={leaderRow}
          formatKm={formatKm}
          formatElevation={formatElevation}
          boardTitle={cfg?.title}
          className="mt-3"
        />
      ) : null}
    </div>
  );
}
