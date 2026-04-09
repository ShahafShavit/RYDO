import AdminHeader from '@/features/admin/components/AdminHeader';
import RoutesModerationTable from '@/features/admin/components/RoutesModerationTable';

export default function AdminRoutesPage() {
  return (
    <section className="space-y-6">
      <AdminHeader title="Routes moderation" description="Review route quality, metadata consistency and publication status." />
      <RoutesModerationTable />
    </section>
  );
}
