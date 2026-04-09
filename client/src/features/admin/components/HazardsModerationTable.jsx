import Card from '@/shared/components/ui/card/Card';
import { useAdminHazards } from '@/features/admin/hooks/useAdminHazards';

export default function HazardsModerationTable() {
  const { hazards } = useAdminHazards();

  return (
    <Card>
      <h3 className="text-lg font-semibold">Hazards moderation</h3>
      <div className="mt-4 space-y-3">
        {hazards.map((hazard) => (
          <div key={hazard.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium">{hazard.title}</p>
              <span className="text-sm text-white/56">{hazard.status}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
