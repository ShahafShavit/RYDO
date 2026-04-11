import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import RideEventCard from '@/features/rides/components/RideEventCard';
import RideMembersList from '@/features/rides/components/RideMembersList';
import RideStatusBanner from '@/features/rides/components/RideStatusBanner';
import { useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { useRideAttendance } from '@/features/rides/hooks/useRideAttendance';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Button from '@/shared/components/ui/button/Button';

export default function RideEventPage() {
  const { rideId } = useParams();
  const { user } = useAuth();
  const { ride, isLoading, isError, error, refetch } = useRideEvent(rideId);
  const { joinRide, leaveRide, isJoining, isLeaving } = useRideAttendance(rideId);

  const myUserId = user?.id != null ? Number(user.id) : null;
  const amParticipant = useMemo(() => {
    if (myUserId == null || !ride?.participants) return false;
    return ride.participants.map(Number).includes(myUserId);
  }, [myUserId, ride]);

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl bg-white/10" />
      </section>
    );
  }

  if (isError || !ride) {
    return (
      <section className="space-y-4">
        <p className="text-red-400">{error?.message || 'Could not load this ride.'}</p>
        <Button variant="secondary" type="button" onClick={() => refetch()}>
          Retry
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <RideStatusBanner />
      <RideEventCard ride={ride} />
      {user ? (
        <div className="flex flex-wrap gap-3">
          {amParticipant ? (
            <Button variant="secondary" type="button" onClick={() => leaveRide()} disabled={isLeaving}>
              {isLeaving ? 'Leaving…' : 'Leave ride'}
            </Button>
          ) : (
            <Button variant="primary" type="button" onClick={() => joinRide()} disabled={isJoining}>
              {isJoining ? 'Joining…' : 'Join ride'}
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-white/56">Sign in to join this ride.</p>
      )}
      <RideMembersList members={ride.participantDetails} />
    </section>
  );
}
