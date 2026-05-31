import { useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLeaderboards } from '@/features/leaderboards/hooks/useLeaderboards';
import { isValidLeaderboardBoardId } from '@/features/leaderboards/leaderboard-boards';
import LeaderboardBoardPager from '@/features/leaderboards/components/LeaderboardBoardPager';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';

export default function DashboardLeaderboardsSection() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError } = useLeaderboards();
  const { formatKm, formatElevation } = useFormatDistance();

  const boardParam = searchParams.get('board');
  const initialBoardId = isValidLeaderboardBoardId(boardParam) ? boardParam : undefined;

  return (
    <section className="rydo-panel px-3.5 py-3.5" aria-label="Leaderboards">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-strong text-[var(--rydo-amber)]">
          <Trophy className="h-[17px] w-[17px]" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0">
          <DisplayTitle as="div" size="sm" className="text-lg">
            Leaderboards
          </DisplayTitle>
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-surface-strong" />
      ) : isError ? (
        <p className="rydo-subtle text-sm">Could not load leaderboards.</p>
      ) : (
        <LeaderboardBoardPager
          data={data}
          formatKm={formatKm}
          formatElevation={formatElevation}
          currentUserId={user?.id}
          initialBoardId={initialBoardId}
          compact
          maxListRows={5}
        />
      )}
    </section>
  );
}
