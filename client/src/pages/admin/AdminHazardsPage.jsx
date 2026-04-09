import AdminHeader from '@/features/admin/components/AdminHeader';
import HazardsModerationTable from '@/features/admin/components/HazardsModerationTable';

export default function AdminHazardsPage() {
  return (
    <section className="space-y-6">
      <AdminHeader title="Hazards moderation" description="Monitor reported trail issues and validate what should stay live." />
      <HazardsModerationTable />
    </section>
  );
}
