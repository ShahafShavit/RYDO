import Card from '@/shared/components/ui/card/Card';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';

export default function DashboardStats() {
  const { stats } = useDashboardData();

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
