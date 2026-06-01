import AdminPageShell from '@/features/admin/components/AdminPageShell';
import AdminStatGrid from '@/features/admin/components/AdminStatGrid';
import AdminStatGridBold from '@/features/admin/components/AdminStatGridBold';

export default function AdminDashboardPage() {
  return (
    <AdminPageShell
      title="Dashboard"
      eyebrow="Control"
      description="Platform overview and quick links to moderation tools."
      desktop={<AdminStatGrid />}
      mobile={<AdminStatGridBold />}
    />
  );
}
