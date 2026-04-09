import Card from '@/shared/components/ui/card/Card';
import { useChallengeProgress } from '@/features/challenges/hooks/useChallengeProgress';

export default function ProgressRing() {
  const { completion } = useChallengeProgress();

  return (
    <Card className="grid place-items-center text-center">
      <div className="grid h-36 w-36 place-items-center rounded-full border border-[#7B5CFF]/35 bg-[#7B5CFF]/10 text-3xl font-semibold shadow-[0_0_40px_rgba(123,92,255,0.22)]">
        {completion}%
      </div>
      <p className="mt-5 text-white/64">Challenge completion</p>
    </Card>
  );
}
