import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import Badge from '@/shared/components/ui/badge/Badge';
import { ROUTES } from '@/app/router/route-paths';

export default function RideGroupCard({ group }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">{group.name}</h3>
          <p className="mt-2 text-white/60">{group.time}</p>
        </div>
        <Badge variant="success">{group.riders} riders</Badge>
      </div>

      <div className="mt-6">
        <Link to={ROUTES.rideEvent.replace(':rideId', group.id)}>
          <Button variant="secondary">View ride</Button>
        </Link>
      </div>
    </Card>
  );
}
