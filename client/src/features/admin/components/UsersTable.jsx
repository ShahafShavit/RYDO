import Card from '@/shared/components/ui/card/Card';
import { useAdminUsers } from '@/features/admin/hooks/useAdminUsers';

export default function UsersTable() {
  const { users } = useAdminUsers();

  return (
    <Card>
      <h3 className="text-lg font-semibold">Users</h3>
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/8">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/56">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-white/8">
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3 text-white/64">{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
