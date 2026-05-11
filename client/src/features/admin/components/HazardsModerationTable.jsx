import Card from '@/shared/components/ui/card/Card';
import { useAdminHazards } from '@/features/admin/hooks/useAdminHazards';
import { useUpdateHazardStatus } from '@/features/admin/hooks/useAdminHazards';
import Button from '@/shared/components/ui/button/Button';

export default function HazardsModerationTable() {
  const { hazards, isLoading, isError, error } = useAdminHazards({ skip: 0, take: 50 });
  const updateHazardStatus = useUpdateHazardStatus();

  if (isLoading) return <Card>Loading hazards…</Card>;
  if (isError) return <Card>{error?.message || 'Failed to load hazards.'}</Card>;

  return (
    <Card>
      <h3 className="text-lg font-semibold">Hazards moderation</h3>
      <div className="mt-4 space-y-3">
        {hazards.map((hazard) => (
          <div key={hazard.id} className="rounded-2xl border border-border bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">{hazard.type}</p>
                <p className="mt-1 text-sm text-fg-muted">{hazard.severity} severity</p>
              </div>
              <span className="text-sm text-fg-muted">{hazard.status}</span>
            </div>
            <div className="mt-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateHazardStatus.mutate({ hazardId: hazard.id, status: 'resolved' })}
                disabled={updateHazardStatus.isPending || hazard.status === 'resolved'}
              >
                Resolve
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
