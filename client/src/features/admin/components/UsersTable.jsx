import Card from '@/shared/components/ui/card/Card';
import { useAdminUsers } from '@/features/admin/hooks/useAdminUsers';
import { useDeleteUser } from '@/features/admin/hooks/useAdminUsers';
import Button from '@/shared/components/ui/button/Button';

export default function UsersTable() {
  const { users, isLoading, isError, error } = useAdminUsers({ skip: 0, take: 50 });
  const deleteUser = useDeleteUser();

  if (isLoading) return <Card>Loading users…</Card>;
  if (isError) return <Card>{error?.message || 'Failed to load users.'}</Card>;

  return (
    <Card>
      <h3 className="text-lg font-semibold">Users</h3>
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/8">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/56">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-white/8">
                <td className="px-4 py-3">{user.fullName}</td>
                <td className="px-4 py-3 text-white/64">{user.email}</td>
                <td className="px-4 py-3 text-white/64">{user.role}</td>
                <td className="px-4 py-3 text-white/64">{user.status}</td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteUser.mutate(user.id)}
                    disabled={deleteUser.isPending}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
