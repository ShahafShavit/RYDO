import Card from '@/shared/components/ui/card/Card';
import { useAdminRoutes } from '@/features/admin/hooks/useAdminRoutes';

export default function RoutesModerationTable() {
  const { routes } = useAdminRoutes();

  return (
    <Card>
      <h3 className="text-lg font-semibold">Routes moderation</h3>
      <div className="mt-4 space-y-3">
        {routes.map((route) => (
          <div key={route.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium">{route.name}</p>
              <span className="text-sm text-white/56">{route.status}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
