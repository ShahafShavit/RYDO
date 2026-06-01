import AdminPageShell from '@/features/admin/components/AdminPageShell';
import AdminUsersPanel from '@/features/admin/components/AdminUsersPanel';

export default function AdminUsersPage() {
  return (
    <AdminPageShell
      title="Users"
      description="Search riders, manage roles, and remove accounts."
      desktop={<AdminUsersPanel variant="desktop" />}
      mobile={<AdminUsersPanel variant="mobile" />}
    />
  );
}
