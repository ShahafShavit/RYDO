import { useParams } from 'react-router-dom';
import RideEventCard from '@/features/rides/components/RideEventCard';
import RideMembersList from '@/features/rides/components/RideMembersList';
import RideStatusBanner from '@/features/rides/components/RideStatusBanner';
import { useRideEvent } from '@/features/rides/hooks/useRideEvent';

export default function RideEventPage() {
  const { rideId } = useParams();
  const { ride } = useRideEvent(rideId || 1);

  if (!ride) return null;

  return (
    <section className="space-y-6">
      <RideStatusBanner />
      <RideEventCard ride={ride} />
      <RideMembersList />
    </section>
  );
}
