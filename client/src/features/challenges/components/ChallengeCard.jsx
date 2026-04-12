import Card from '@/shared/components/ui/card/Card';
import Badge from '@/shared/components/ui/badge/Badge';

export default function ChallengeCard({ challenge }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{challenge.title}</h3>
          <p className="mt-2 text-fg-muted">Keep momentum through structured goals.</p>
        </div>
        <Badge variant="success">{challenge.progress}</Badge>
      </div>
    </Card>
  );
}
