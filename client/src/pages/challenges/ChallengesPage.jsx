import ChallengeCard from '@/features/challenges/components/ChallengeCard';
import ProgressRing from '@/features/challenges/components/ProgressRing';
import AchievementList from '@/features/challenges/components/AchievementList';
import { useChallenges } from '@/features/challenges/hooks/useChallenges';

export default function ChallengesPage() {
  const { challenges } = useChallenges();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-white/42">Motivation</p>
        <h1 className="mt-2 text-3xl font-semibold">Challenges and progress</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <ProgressRing />
        <AchievementList />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {challenges.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} />)}
      </div>
    </section>
  );
}
