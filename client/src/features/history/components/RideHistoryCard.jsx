import Card from '@/shared/components/ui/card/Card';
import { formatDate } from '@/shared/utils/format-date';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';

export default function RideHistoryCard({ ride }) {
  const { formatKm } = useFormatDistance();
  const dist =
    ride.distanceKm != null && Number.isFinite(ride.distanceKm) ? formatKm(ride.distanceKm) : '—';
  return (
    <Card>
      <h3 className="w-full min-w-0 text-center text-lg font-semibold">
        <span className="inline-block max-w-full truncate align-top" title={ride.title} dir="auto">
          {ride.title}
        </span>
      </h3>
      <p className="mt-2 text-fg-muted">{formatDate(ride.date)} • {dist}</p>
    </Card>
  );
}
