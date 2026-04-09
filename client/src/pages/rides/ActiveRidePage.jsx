import RideMap from '@/features/navigation/components/RideMap';
import NavigationControls from '@/features/navigation/components/NavigationControls';
import OfflineMapBanner from '@/features/navigation/components/OfflineMapBanner';

export default function ActiveRidePage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-white/42">Live ride</p>
        <h1 className="mt-2 text-3xl font-semibold">Active ride navigation</h1>
      </div>
      <OfflineMapBanner />
      <NavigationControls />
      <RideMap />
    </section>
  );
}
