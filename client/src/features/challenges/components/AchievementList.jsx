import Card from '@/shared/components/ui/card/Card';

export default function AchievementList() {
  const achievements = ['Weekend streak', 'Route publisher', 'Group rider'];

  return (
    <Card>
      <h3 className="text-lg font-semibold">Achievements</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {achievements.map((item) => (
          <span key={item} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/72">{item}</span>
        ))}
      </div>
    </Card>
  );
}
