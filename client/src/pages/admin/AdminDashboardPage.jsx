import AdminHeader from '@/features/admin/components/AdminHeader';
import AdminStatsCards from '@/features/admin/components/AdminStatsCards';

export default function AdminDashboardPage() {
  return (
    <section className="space-y-6">
      <AdminHeader />
      <AdminStatsCards />
    </section>
  );
}
