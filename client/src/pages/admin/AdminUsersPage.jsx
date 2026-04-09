import AdminHeader from '@/features/admin/components/AdminHeader';
import UsersTable from '@/features/admin/components/UsersTable';

export default function AdminUsersPage() {
  return (
    <section className="space-y-6">
      <AdminHeader title="Users management" description="Review platform members, roles and future moderation actions." />
      <UsersTable />
    </section>
  );
}
