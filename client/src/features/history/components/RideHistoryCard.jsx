import Card from '@/shared/components/ui/card/Card';
import { formatDate } from '@/shared/utils/format-date';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';

export default function RideHistoryCard({ ride }) {
  const { formatKm } = useFormatDistance();
  const dist =
    ride.distanceKm != null && Number.isFinite(ride.distanceKm) ? formatKm(ride.distanceKm) : '—';
  return (
    <Card>
      <h3 className="text-lg font-semibold">{ride.title}</h3>
      <p className="mt-2 text-fg-muted">{formatDate(ride.date)} • {dist}</p>
    </Card>
  );
}
