import Card from '@/shared/components/ui/card/Card';
import Badge from '@/shared/components/ui/badge/Badge';

export default function RideEventCard({ ride }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neon">Upcoming</Badge>
        <Badge>{ride.routeName}</Badge>
      </div>
      <h1 className="mt-4 text-3xl font-semibold">{ride.name}</h1>
      <p className="mt-2 text-white/64">{ride.time}</p>
      <p className="mt-4 text-white/72">{ride.notes}</p>
    </Card>
  );
}
