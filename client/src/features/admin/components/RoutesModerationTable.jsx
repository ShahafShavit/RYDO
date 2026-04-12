import Card from '@/shared/components/ui/card/Card';
import { useAdminRoutes } from '@/features/admin/hooks/useAdminRoutes';
import { useDeleteRoute, useModerateRoute } from '@/features/admin/hooks/useAdminRoutes';
import Button from '@/shared/components/ui/button/Button';

export default function RoutesModerationTable() {
  const { routes, isLoading, isError, error } = useAdminRoutes({ skip: 0, take: 50 });
  const deleteRoute = useDeleteRoute();
  const moderateRoute = useModerateRoute();

  if (isLoading) return <Card>Loading routes…</Card>;
  if (isError) return <Card>{error?.message || 'Failed to load routes.'}</Card>;

  return (
    <Card>
      <h3 className="text-lg font-semibold">Routes moderation</h3>
      <div className="mt-4 space-y-3">
        {routes.map((route) => (
          <div key={route.id} className="rounded-2xl border border-border bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">{route.title}</p>
                <p className="mt-1 text-sm text-fg-muted">{route.ownerName} • {route.terrain} • {route.difficulty}</p>
              </div>
              <span className="text-sm text-fg-muted">{route.status}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moderateRoute.mutate({ routeId: route.id, status: 'flagged' })}
                disabled={moderateRoute.isPending}
              >
                Flag
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteRoute.mutate(route.id)}
                disabled={deleteRoute.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
