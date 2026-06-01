import { useState } from 'react';
import { Link } from 'react-router-dom';
import { userProfilePath } from '@/shared/lib/user-paths';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import Loader from '@/shared/components/feedback/Loader';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAdminUsers, useDeleteUser, useUpdateUserRole } from '@/features/admin/hooks/useAdminUsers';
import { useDebouncedValue } from '@/features/admin/hooks/useDebouncedValue';
import AdminToolbar, { AdminFilterPills } from '@/features/admin/components/AdminToolbar';
import AdminPagination from '@/features/admin/components/AdminPagination';
import AdminConfirmModal from '@/features/admin/components/AdminConfirmModal';
import AdminStatusPill from '@/features/admin/components/AdminStatusPill';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminErrorState from '@/features/admin/components/AdminErrorState';
import AdminInlineBanner from '@/features/admin/components/AdminInlineBanner';

const ROLE_FILTERS = [
  { label: 'All roles', value: '' },
  { label: 'Admin', value: 'admin' },
  { label: 'User', value: 'user' },
];

function UsersTableDesktop({ users, currentUser, onDelete, onToggleRole, rolePendingId }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-fg-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Activity</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = currentUser?.id === user.id;
            const isAdmin = user.role === 'admin';
            return (
              <tr key={user.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link
                    to={userProfilePath(user.handle)}
                    className="inline-flex items-center gap-2 text-fg/90 hover:text-fg hover:underline"
                  >
                    <UserAvatar displayName={user.fullName} sizeClass="h-8 w-8" />
                    {user.fullName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-fg-muted">{user.email}</td>
                <td className="px-4 py-3">
                  <AdminStatusPill label={user.role} />
                </td>
                <td className="px-4 py-3 text-fg-muted">
                  {user.routeCount} routes · {user.rideCount} rides
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isSelf || rolePendingId === user.id}
                      onClick={() => onToggleRole(user)}
                    >
                      {isAdmin ? 'Make user' : 'Make admin'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-300"
                      disabled={isSelf}
                      onClick={() => onDelete(user)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UsersListBold({ users, currentUser, onDelete, onToggleRole, rolePendingId }) {
  return (
    <div className="space-y-2">
      {users.map((user) => {
        const isSelf = currentUser?.id === user.id;
        const isAdmin = user.role === 'admin';
        return (
          <div key={user.id} className="rydo-bold-glass-row px-4 py-3.5">
            <div className="flex items-start gap-3">
              <UserAvatar displayName={user.fullName} sizeClass="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={userProfilePath(user.handle)} className="font-medium hover:underline">
                    {user.fullName}
                  </Link>
                  <AdminStatusPill label={user.role} />
                </div>
                <p className="mt-1 truncate text-sm text-fg-muted">{user.email}</p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {user.routeCount} routes · {user.rideCount} rides
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={isSelf || rolePendingId === user.id}
                onClick={() => onToggleRole(user)}
              >
                {isAdmin ? 'Make user' : 'Make admin'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-300"
                disabled={isSelf}
                onClick={() => onDelete(user)}
              >
                Delete
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminUsersPanel({ variant = 'desktop' }) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(20);
  const [confirm, setConfirm] = useState(null);
  const [banner, setBanner] = useState(null);

  const debouncedSearch = useDebouncedValue(search);
  const { users, pagination, isLoading, isError, error } = useAdminUsers({
    skip,
    take,
    search: debouncedSearch,
    role,
  });
  const deleteUser = useDeleteUser();
  const updateRole = useUpdateUserRole();
  const { user: currentUser } = useAuth();

  function resetPage() {
    setSkip(0);
  }

  const toolbar = (
    <AdminToolbar
      search={search}
      onSearchChange={(value) => {
        setSearch(value);
        resetPage();
      }}
      searchPlaceholder="Search name, email, or handle…"
      total={pagination.total}
      filters={
        <AdminFilterPills
          options={ROLE_FILTERS}
          value={role}
          onChange={(value) => {
            setRole(value);
            resetPage();
          }}
        />
      }
    />
  );

  async function handleConfirm() {
    if (!confirm) return;
    try {
      await deleteUser.mutateAsync(confirm.user.id);
      setBanner({ tone: 'success', message: `${confirm.user.fullName} was deleted.` });
      setConfirm(null);
    } catch (err) {
      setConfirm((prev) => ({ ...prev, error: err?.message || 'Action failed.' }));
    }
  }

  function handleToggleRole(user) {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    updateRole.mutate(
      { userId: user.id, role: nextRole },
      {
        onSuccess: () => {
          setBanner({
            tone: 'success',
            message: `${user.fullName} is now ${nextRole === 'admin' ? 'an admin' : 'a user'}.`,
          });
        },
        onError: (err) => {
          setBanner({ tone: 'error', message: err?.message || 'Could not update role.' });
        },
      },
    );
  }

  const rolePendingId = updateRole.isPending ? updateRole.variables?.userId : null;

  const listProps = {
    users,
    currentUser,
    onDelete: (user) => setConfirm({ type: 'delete', user, error: null }),
    onToggleRole: handleToggleRole,
    rolePendingId,
  };

  let body;
  if (isLoading) {
    body = <Loader />;
  } else if (isError) {
    body = <AdminErrorState message={error?.message || 'Failed to load users.'} />;
  } else if (users.length === 0) {
    body = <AdminEmptyState title="No users found" />;
  } else if (variant === 'mobile') {
    body = <UsersListBold {...listProps} />;
  } else {
    body = (
      <Card>
        <UsersTableDesktop {...listProps} />
        <AdminPagination
          className="mt-4"
          skip={skip}
          take={take}
          total={pagination.total}
          onPageChange={setSkip}
          onPageSizeChange={(value) => {
            setTake(value);
            resetPage();
          }}
        />
      </Card>
    );
  }

  return (
    <>
      {toolbar}
      {banner ? (
        <AdminInlineBanner tone={banner.tone} message={banner.message} onDismiss={() => setBanner(null)} />
      ) : null}
      {body}
      {variant === 'mobile' && !isLoading && !isError && users.length > 0 ? (
        <AdminPagination
          skip={skip}
          take={take}
          total={pagination.total}
          onPageChange={setSkip}
          onPageSizeChange={(value) => {
            setTake(value);
            resetPage();
          }}
        />
      ) : null}
      <AdminConfirmModal
        open={confirm != null}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title="Delete user"
        message={
          confirm
            ? `Permanently delete ${confirm.user.fullName}? Their routes will be reassigned to the system admin.`
            : ''
        }
        confirmLabel="Delete user"
        isPending={deleteUser.isPending}
        error={confirm?.error}
      />
    </>
  );
}
