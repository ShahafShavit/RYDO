import Card from '@/shared/components/ui/card/Card';
import { useChallengeProgress } from '@/features/challenges/hooks/useChallengeProgress';

export default function ProgressRing() {
  const { completion } = useChallengeProgress();

  return (
    <Card className="grid place-items-center text-center">
      <div className="grid h-36 w-36 place-items-center rounded-full border border-rydo-purple/35 bg-rydo-purple/10 text-3xl font-semibold shadow-[0_0_40px_color-mix(in_srgb,var(--rydo-purple)_22%,transparent)]">
        {completion}%
      </div>
      <p className="mt-5 text-fg-muted">Challenge completion</p>
    </Card>
  );
}
