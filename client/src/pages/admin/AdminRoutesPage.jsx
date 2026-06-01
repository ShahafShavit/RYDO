import AdminPageShell from '@/features/admin/components/AdminPageShell';
import AdminRoutesPanel from '@/features/admin/components/AdminRoutesPanel';

export default function AdminRoutesPage() {
  return (
    <AdminPageShell
      title="Routes"
      description="Review community routes, flag issues, and remove content."
      desktop={<AdminRoutesPanel variant="desktop" />}
      mobile={<AdminRoutesPanel variant="mobile" />}
    />
  );
}
