import Card from '@/shared/components/ui/card/Card';
import ProgressRingViz from '@/shared/components/bold/viz/ProgressRing';
import { useGamificationMe } from '@/features/gamification/hooks/useGamification';

export default function ProgressRing() {
  const { data, isLoading } = useGamificationMe();
  const progress = ((data?.levelProgressPercent ?? 0) / 100);
  const level = data?.level ?? 1;

  return (
    <Card className="grid place-items-center text-center">
      {isLoading ? (
        <div className="h-36 w-36 animate-pulse rounded-full bg-surface-strong" />
      ) : (
        <ProgressRingViz value={progress} size={144} strokeWidth={8}>
          <span className="text-3xl font-semibold">{level}</span>
        </ProgressRingViz>
      )}
      <p className="mt-5 text-fg-muted">Level progress</p>
      <p className="rydo-subtle mt-1 text-xs">{data?.totalXp ?? 0} XP total</p>
    </Card>
  );
}
