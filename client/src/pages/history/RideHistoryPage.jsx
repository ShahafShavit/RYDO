import RideHistoryCard from '@/features/history/components/RideHistoryCard';
import RideSummaryStats from '@/features/history/components/RideSummaryStats';
import CompletedRouteMapPreview from '@/features/history/components/CompletedRouteMapPreview';
import { useRideHistory } from '@/features/history/hooks/useRideHistory';

export default function RideHistoryPage() {
  const { rides } = useRideHistory();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">History</p>
        <h1 className="mt-2 text-3xl font-semibold">Ride history</h1>
      </div>
      <RideSummaryStats />
      <CompletedRouteMapPreview />
      <div className="grid gap-4 lg:grid-cols-2">
        {rides.map((ride) => <RideHistoryCard key={ride.id} ride={ride} />)}
      </div>
    </section>
  );
}
