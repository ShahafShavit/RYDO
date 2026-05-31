import { Bike, MapPinned, Mountain, Route } from 'lucide-react';
import { helpTooltip } from '@/shared/content/help-tooltips';

/** Stable ids aligned with GET /api/leaderboards JSON keys. */
export const LEADERBOARD_BOARD_IDS = [
  'horizonChasers',
  'saddleJunkies',
  'summitSeekers',
  'trailblazers',
];

export const LEADERBOARD_BOARD_CONFIG = {
  horizonChasers: {
    id: 'horizonChasers',
    title: 'Total distance',
    subtitle: 'Horizon Chasers',
    Icon: Route,
    helpText: helpTooltip('leaderboardHorizonChasers'),
  },
  saddleJunkies: {
    id: 'saddleJunkies',
    title: 'Most rides',
    subtitle: 'Saddle Junkies',
    Icon: Bike,
    helpText: helpTooltip('leaderboardSaddleJunkies'),
  },
  summitSeekers: {
    id: 'summitSeekers',
    title: 'Total elevation',
    subtitle: 'Summit Seekers',
    Icon: Mountain,
    helpText: helpTooltip('leaderboardSummitSeekers'),
  },
  trailblazers: {
    id: 'trailblazers',
    title: 'Published routes',
    subtitle: 'Trailblazers',
    Icon: MapPinned,
    helpText: helpTooltip('leaderboardTrailblazers'),
  },
};

/**
 * @param {string | null | undefined} id
 * @returns {id is keyof typeof LEADERBOARD_BOARD_CONFIG}
 */
export function isValidLeaderboardBoardId(id) {
  return id != null && id !== '' && LEADERBOARD_BOARD_IDS.includes(String(id));
}

/**
 * @param {number} rank
 * @returns {string} Tailwind classes for rank row accent (top 3)
 */
export function leaderboardRankRowClass(rank) {
  if (rank === 1) return 'border-amber-500/35 bg-amber-500/[0.07]';
  if (rank === 2) return 'border-slate-400/35 bg-slate-400/[0.08]';
  if (rank === 3) return 'border-amber-800/40 bg-amber-900/15';
  return '';
}

/**
 * @param {number} rank
 * @returns {string} Tailwind classes for profile badge chip
 */
export function leaderboardBadgeChipClass(rank) {
  if (rank === 1) return 'border-amber-500/50 bg-amber-500/15 text-amber-100';
  if (rank === 2) return 'border-slate-400/45 bg-slate-400/15 text-slate-100';
  if (rank === 3) return 'border-amber-800/50 bg-amber-950/35 text-amber-200/95';
  return 'border-border bg-surface-strong text-fg-muted';
}
