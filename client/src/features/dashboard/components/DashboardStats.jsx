import Card from '@/shared/components/ui/card/Card';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';

export default function DashboardStats() {
  const { stats, statsLoading } = useDashboardData();

  if (statsLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((key) => (
          <Card key={key}>
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            <div className="mt-4 h-10 w-16 animate-pulse rounded bg-white/10" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <p className="text-sm text-white/48">{stat.label}</p>
          <p className="mt-4 text-4xl font-semibold">{stat.value}</p>
        </Card>
      ))}
    </div>
  );
}
