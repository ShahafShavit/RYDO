import Card from '@/shared/components/ui/card/Card';
import TruncatedText from '@/shared/components/ui/TruncatedText';
import { formatDate } from '@/shared/utils/format-date';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';

export default function RideHistoryCard({ ride }) {
  const { formatKm } = useFormatDistance();
  const dist =
    ride.distanceKm != null && Number.isFinite(ride.distanceKm) ? formatKm(ride.distanceKm) : '—';
  return (
    <Card className="min-w-0">
      <h3 className="w-full min-w-0 text-center text-lg font-semibold">
        <TruncatedText>{ride.title}</TruncatedText>
      </h3>
      <p className="mt-2 text-fg-muted">{formatDate(ride.date)} • {dist}</p>
    </Card>
  );
}
