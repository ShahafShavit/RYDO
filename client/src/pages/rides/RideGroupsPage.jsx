import { useState } from 'react';
import Button from '@/shared/components/ui/button/Button';
import CreateRideForm from '@/features/rides/components/CreateRideForm';
import RideGroupCard from '@/features/rides/components/RideGroupCard';
import UploadRouteModal from '@/features/routes/components/UploadRouteModal';
import { useRideGroups } from '@/features/rides/hooks/useRideGroups';

export default function RideGroupsPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { groups } = useRideGroups();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">Groups</p>
          <h1 className="mt-2 text-3xl font-semibold">Ride groups</h1>
        </div>
        <Button variant="primary" onClick={() => setIsUploadModalOpen(true)}>
          Upload GPX Route
        </Button>
      </div>
      <CreateRideForm />
      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map((group) => <RideGroupCard key={group.id} group={group} />)}
      </div>

      <UploadRouteModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={(route) => {
          console.log('Route saved:', route);
          // Refresh list or navigate
        }}
      />
    </section>
  );
}
