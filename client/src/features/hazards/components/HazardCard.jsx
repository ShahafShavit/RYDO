import Card from '@/shared/components/ui/card/Card';
import Badge from '@/shared/components/ui/badge/Badge';

export default function HazardCard({ hazard }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{hazard.title}</h3>
          <p className="mt-2 text-white/60">Severity: {hazard.severity}</p>
        </div>
        <Badge variant="neon">{hazard.status}</Badge>
      </div>
    </Card>
  );
}
