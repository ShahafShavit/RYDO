import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import Card from '@/shared/components/ui/card/Card';
import { ROUTES } from '@/app/router/route-paths';
import { useLeaderboards } from '@/features/leaderboards/hooks/useLeaderboards';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import {
  LEADERBOARD_BOARD_IDS,
  LEADERBOARD_BOARD_CONFIG,
  isValidLeaderboardBoardId,
  leaderboardRankRowClass,
} from '@/features/leaderboards/leaderboard-boards';

/**
 * @typedef {{ rank: number, userId: number, displayName: string, avatarUrl: string | null, value: number, unit: string }} LeaderboardRow
 */

function formatValue(row, formatKm, formatMeters) {
  if (row.unit === 'km') return formatKm(row.value, 1);
  if (row.unit === 'm') return formatMeters(row.value, 0);
  if (row.unit === 'rides' || row.unit === 'routes') return String(Math.round(row.value));
  return String(row.value);
}

/**
 * @param {{
 *   boardId: string,
 *   rows: LeaderboardRow[],
 *   formatKm: (n: number, d?: number) => string,
 *   formatMeters: (n: number, d?: number) => string,
 * }} props
 */
function LeaderboardColumn({ boardId, rows, formatKm, formatMeters }) {
  const cfg = LEADERBOARD_BOARD_CONFIG[boardId];
  const Icon = cfg.Icon;

  return (
    <Card id={`leaderboard-${boardId}`} className="leaderboard-board-anchor flex min-h-0 flex-col scroll-mt-24 transition-[box-shadow] duration-500">
      <div className="flex items-center gap-4 pb-1">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-strong text-rydo-purple shadow-sm shadow-black/10">
          <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1 py-0.5">
          <p className="text-[11px] font-medium uppercase leading-tight tracking-[0.18em] text-fg-subtle">
            {cfg.title}
          </p>
          <h2 className="mt-1.5 text-xl font-semibold leading-snug tracking-tight text-fg">{cfg.subtitle}</h2>
        </div>
      </div>
      <ul className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <li className="text-sm text-fg-muted">No data yet.</li>
        ) : (
          rows.map((row) => {
            const accent = leaderboardRankRowClass(row.rank);
            return (
              <li key={`${row.userId}-${row.rank}`}>
                <Link
                  to={ROUTES.userProfile.replace(':userId', String(row.userId))}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition hover:border-border-strong ${accent || 'border-border bg-surface'}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rydo-purple/20 text-sm font-semibold text-fg">
                    {row.rank}
                  </span>
                  {row.avatarUrl ? (
                    <img src={row.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-strong text-xs font-medium text-fg-muted">
                      {(row.displayName || '?').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg">{row.displayName}</p>
                    <p className="text-sm text-rydo-purple">{formatValue(row, formatKm, formatMeters)}</p>
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </Card>
  );
}

export default function LeaderboardsPage() {
  const { data, isPending, isError, error } = useLeaderboards();
  const { formatKm, formatMeters } = useFormatDistance();
  const [searchParams] = useSearchParams();
  const boardParam = searchParams.get('board');

  useEffect(() => {
    if (!data || !boardParam || !isValidLeaderboardBoardId(boardParam)) return undefined;

    const el = document.getElementById(`leaderboard-${boardParam}`);
    if (!el) return undefined;

    const ringClass = [
      'ring-2',
      'ring-rydo-purple/50',
      'ring-offset-2',
      'ring-offset-[var(--rydo-bg-deep)]',
    ];

    const t0 = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add(...ringClass);
    }, 100);

    const t1 = window.setTimeout(() => {
      el.classList.remove(...ringClass);
    }, 2400);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      el.classList.remove(...ringClass);
    };
  }, [data, boardParam]);

  if (isPending) {
    const bar = 'h-4 rounded bg-surface-strong animate-pulse';
    return (
      <section className="space-y-6">
        <div className={`${bar} h-5 w-40`} />
        <div className="grid grid-cols-1 gap-6 sm:gap-7 md:grid-cols-2 md:gap-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <div className={`${bar} w-48`} />
              <div className={`${bar} mt-3 h-8 w-3/4`} />
              <div className="mt-5 space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className={`${bar} h-14 w-full`} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        {error?.message || 'Could not load leaderboards.'}
      </p>
    );
  }

  /** @type {{ horizonChasers: LeaderboardRow[], saddleJunkies: LeaderboardRow[], summitSeekers: LeaderboardRow[], trailblazers: LeaderboardRow[] }} */
  const lb = data;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-strong text-rydo-purple shadow-[0_0_28px_color-mix(in_srgb,var(--rydo-purple)_22%,transparent)]">
          <Trophy className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Community</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg">Leaderboards</h1>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">
            Top riders and route creators on RYDO — see how you stack up against the community.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:gap-7 md:grid-cols-2 md:gap-8">
        {LEADERBOARD_BOARD_IDS.map((boardId) => (
          <LeaderboardColumn
            key={boardId}
            boardId={boardId}
            rows={lb[boardId] ?? []}
            formatKm={formatKm}
            formatMeters={formatMeters}
          />
        ))}
      </div>
    </section>
  );
}
