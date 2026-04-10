import Card from '@/shared/components/ui/card/Card';
import Badge from '@/shared/components/ui/badge/Badge';

export default function HazardCard({ hazard }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold capitalize">{hazard.type}</h3>
          <p className="mt-2 text-white/60">{hazard.description || 'No additional details provided.'}</p>
          <p className="mt-2 text-white/40">Severity: {hazard.severity}</p>
        </div>
        <Badge variant="neon">{hazard.status}</Badge>
      </div>
    </Card>
  );
}
