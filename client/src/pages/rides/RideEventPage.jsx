import RideEventCard from '@/features/rides/components/RideEventCard';
import RideMembersList from '@/features/rides/components/RideMembersList';
import RideStatusBanner from '@/features/rides/components/RideStatusBanner';
import { useRideEvent } from '@/features/rides/hooks/useRideEvent';

export default function RideEventPage() {
  const { ride } = useRideEvent();

  return (
    <section className="space-y-6">
      <RideStatusBanner />
      <RideEventCard ride={ride} />
      <RideMembersList />
    </section>
  );
}
