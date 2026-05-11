import { useAdminSummary } from '@/features/admin/hooks/useAdminSummary';
import Loader from '@/shared/components/feedback/Loader';
import Card from '@/shared/components/ui/card/Card';

export default function AdminStatsCards() {
  const { data, isLoading, isError, error } = useAdminSummary();

  const items = [
    ['Users', data?.totalUsers],
    ['Routes', data?.totalRoutes],
    ['Live hazards', data?.liveHazards],
  ];

  if (isLoading) {
    return <Loader />;
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error?.message || 'Could not load admin statistics.'}
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map(([label, value]) => (
        <Card key={label}>
          <p className="text-sm text-fg-subtle">{label}</p>
          <p className="mt-3 text-3xl font-semibold">{String(value ?? '0')}</p>
        </Card>
      ))}
    </div>
  );
}
