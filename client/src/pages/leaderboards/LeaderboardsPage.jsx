import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import { ROUTES } from '@/app/router/route-paths';
import { useLeaderboards } from '@/features/leaderboards/hooks/useLeaderboards';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';

/**
 * @typedef {{ rank: number, userId: number, displayName: string, avatarUrl: string | null, value: number, unit: string }} LeaderboardRow
 */

function formatValue(row, formatKm, formatMeters) {
  if (row.unit === 'km') return formatKm(row.value, 1);
  if (row.unit === 'm') return formatMeters(row.value, 0);
  if (row.unit === 'rides' || row.unit === 'routes') return String(Math.round(row.value));
  return String(row.value);
}

function LeaderboardColumn({ title, subtitle, rows, formatKm, formatMeters }) {
  return (
    <Card className="flex flex-col min-h-0">
      <div>
        <p className="text-sm uppercase tracking-[0.16em] text-fg-subtle">{title}</p>
        <h2 className="mt-2 text-xl font-semibold text-fg">{subtitle}</h2>
      </div>
      <ul className="mt-5 space-y-3">
        {rows.length === 0 ? (
          <li className="text-sm text-fg-muted">No data yet.</li>
        ) : (
          rows.map((row) => (
            <li key={`${row.userId}-${row.rank}`}>
              <Link
                to={ROUTES.userProfile.replace(':userId', String(row.userId))}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5 transition hover:border-border-strong"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rydo-purple/20 text-sm font-semibold text-fg">
                  {row.rank}
                </span>
                {row.avatarUrl ? (
                  <img
                    src={row.avatarUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
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
          ))
        )}
      </ul>
    </Card>
  );
}

export default function LeaderboardsPage() {
  const { data, isPending, isError, error } = useLeaderboards();
  const { formatKm, formatMeters } = useFormatDistance();

  if (isPending) {
    const bar = 'h-4 rounded bg-surface-strong animate-pulse';
    return (
      <section className="space-y-6">
        <div className={`${bar} h-5 w-40`} />
        <div className="grid gap-6 md:grid-cols-2">
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
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Community</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg">Leaderboards</h1>
        <p className="mt-2 max-w-2xl text-sm text-fg-muted">
          Top riders and route creators on RYDO — see how you stack up against the community.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <LeaderboardColumn
          title="Total distance"
          subtitle="Horizon Chasers"
          rows={lb.horizonChasers ?? []}
          formatKm={formatKm}
          formatMeters={formatMeters}
        />
        <LeaderboardColumn
          title="Most rides"
          subtitle="Saddle Junkies"
          rows={lb.saddleJunkies ?? []}
          formatKm={formatKm}
          formatMeters={formatMeters}
        />
        <LeaderboardColumn
          title="Total elevation"
          subtitle="Summit Seekers"
          rows={lb.summitSeekers ?? []}
          formatKm={formatKm}
          formatMeters={formatMeters}
        />
        <LeaderboardColumn
          title="Published routes"
          subtitle="Trailblazers"
          rows={lb.trailblazers ?? []}
          formatKm={formatKm}
          formatMeters={formatMeters}
        />
      </div>
    </section>
  );
}
