import { Trophy } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import LeaderboardBoardPager from '@/features/leaderboards/components/LeaderboardBoardPager';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import IconButton from '@/shared/components/bold/IconButton';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import BoldScrollArea from '@/shared/components/bold/BoldScrollArea';

export default function LeaderboardsPageBold({ data, formatKm, formatElevation, initialBoardId }) {
  const { user } = useAuth();

  return (
    <BoldScreen>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 pb-1 pt-1">
          <IconButton icon={Trophy} className="text-[var(--rydo-amber)]" aria-label="Leaderboards" />
          <div className="min-w-0 flex-1">
            <DisplayTitle as="div" size="sm" className="text-xl">
              Leaderboards
            </DisplayTitle>
          </div>
        </div>

        <BoldScrollArea className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3">
          <LeaderboardBoardPager
            data={data}
            formatKm={formatKm}
            formatElevation={formatElevation}
            currentUserId={user?.id}
            initialBoardId={initialBoardId}
          />
        </BoldScrollArea>
      </div>
    </BoldScreen>
  );
}
