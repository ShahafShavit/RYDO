import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import LeaderboardBoardPager from '@/features/leaderboards/components/LeaderboardBoardPager';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import IconButton from '@/shared/components/bold/IconButton';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import BoldScrollArea from '@/shared/components/bold/BoldScrollArea';

export default function LeaderboardsPageBold({
  data,
  formatKm,
  formatElevation,
  initialBoardId,
  isLoading = false,
  isError = false,
  error,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <BoldScreen>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 px-5 pb-1 pt-1">
          <IconButton icon={ArrowLeft} aria-label="Back" onClick={() => navigate(-1)} />
          <div className="min-w-0 flex-1">
            <DisplayTitle as="div" size="sm" className="text-xl">
              Leaderboards
            </DisplayTitle>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-strong text-[var(--rydo-amber)]">
            <Trophy className="h-[17px] w-[17px]" strokeWidth={2} aria-hidden />
          </span>
        </header>

        <BoldScrollArea className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-3">
          {isLoading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-surface-strong" />
          ) : isError ? (
            <p className="rydo-subtle rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {error?.message || 'Could not load leaderboards.'}
            </p>
          ) : (
            <LeaderboardBoardPager
              data={data}
              formatKm={formatKm}
              formatElevation={formatElevation}
              currentUserId={user?.id}
              initialBoardId={initialBoardId}
              showYourStanding
            />
          )}
        </BoldScrollArea>
      </div>
    </BoldScreen>
  );
}
