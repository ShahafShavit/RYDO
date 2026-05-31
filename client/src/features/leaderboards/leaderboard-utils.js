import { ROUTES } from '@/app/router/route-paths';
import { isValidLeaderboardBoardId } from '@/features/leaderboards/leaderboard-boards';

/**
 * @param {Array<{ userId: number }>} rows
 * @param {number | string | null | undefined} userId
 */
export function findUserLeaderboardRow(rows, userId) {
  if (userId == null || !Array.isArray(rows)) return null;
  return rows.find((row) => Number(row.userId) === Number(userId)) ?? null;
}

/** @param {string} boardId */
export function leaderboardProfileLinkState(boardId) {
  return {
    from: ROUTES.leaderboards,
    board: isValidLeaderboardBoardId(boardId) ? boardId : undefined,
  };
}

/** @param {unknown} state location.state from react-router */
export function resolveLeaderboardsBackPath(state) {
  if (!state || typeof state !== 'object' || state.from !== ROUTES.leaderboards) return null;
  const board = state.board;
  if (isValidLeaderboardBoardId(board)) {
    return `${ROUTES.leaderboards}?board=${encodeURIComponent(board)}`;
  }
  return ROUTES.leaderboards;
}
