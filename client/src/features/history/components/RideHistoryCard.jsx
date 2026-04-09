import Card from '@/shared/components/ui/card/Card';
import { formatDate } from '@/shared/utils/format-date';

export default function RideHistoryCard({ ride }) {
  return (
    <Card>
      <h3 className="text-lg font-semibold">{ride.title}</h3>
      <p className="mt-2 text-white/60">{formatDate(ride.date)} • {ride.distance}</p>
    </Card>
  );
}
