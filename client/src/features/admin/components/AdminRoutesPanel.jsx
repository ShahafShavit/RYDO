import { useState } from 'react';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import Loader from '@/shared/components/feedback/Loader';
import { formatTrailMetaLabel } from '@/features/routes/utils/route-formatters';
import { useAdminRoutes, useDeleteRoute, useModerateRoute } from '@/features/admin/hooks/useAdminRoutes';
import { useDebouncedValue } from '@/features/admin/hooks/useDebouncedValue';
import AdminToolbar, { AdminFilterPills } from '@/features/admin/components/AdminToolbar';
import AdminPagination from '@/features/admin/components/AdminPagination';
import AdminConfirmModal from '@/features/admin/components/AdminConfirmModal';
import AdminStatusPill from '@/features/admin/components/AdminStatusPill';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminErrorState from '@/features/admin/components/AdminErrorState';
import AdminInlineBanner from '@/features/admin/components/AdminInlineBanner';

const STATUS_FILTERS = [
  { label: 'All statuses', value: '' },
  { label: 'Published', value: 'published' },
  { label: 'Flagged', value: 'flagged' },
  { label: 'Draft', value: 'draft' },
];

function RouteRowDesktop({ route, onFlag, onDelete, pending }) {
  return (
    <div className="rounded-2xl border border-border bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">{route.title}</p>
          <p className="mt-1 text-sm text-fg-muted">
            {route.ownerName} · {formatTrailMetaLabel(route.terrain)} · {formatTrailMetaLabel(route.difficulty)}
          </p>
        </div>
        <AdminStatusPill label={route.status} />
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => onFlag(route)} disabled={pending || route.status === 'flagged'}>
          Flag
        </Button>
        <Button size="sm" variant="ghost" className="text-red-300" onClick={() => onDelete(route)} disabled={pending}>
          Delete
        </Button>
      </div>
    </div>
  );
}

function RouteRowBold({ route, onFlag, onDelete, pending }) {
  return (
    <div className="rydo-bold-glass-row px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{route.title}</p>
          <p className="mt-1 text-sm text-fg-muted">{route.ownerName}</p>
          <p className="mt-1 text-xs text-fg-subtle">
            {formatTrailMetaLabel(route.terrain)} · {formatTrailMetaLabel(route.difficulty)}
          </p>
        </div>
        <AdminStatusPill label={route.status} />
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => onFlag(route)} disabled={pending || route.status === 'flagged'}>
          Flag
        </Button>
        <Button size="sm" variant="ghost" className="text-red-300" onClick={() => onDelete(route)} disabled={pending}>
          Delete
        </Button>
      </div>
    </div>
  );
}

export default function AdminRoutesPanel({ variant = 'desktop' }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(20);
  const [confirm, setConfirm] = useState(null);
  const [banner, setBanner] = useState(null);

  const debouncedSearch = useDebouncedValue(search);
  const { routes, pagination, isLoading, isError, error } = useAdminRoutes({
    skip,
    take,
    search: debouncedSearch,
    status,
  });
  const deleteRoute = useDeleteRoute();
  const moderateRoute = useModerateRoute();
  const pending = deleteRoute.isPending || moderateRoute.isPending;

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
      searchPlaceholder="Search route or owner…"
      total={pagination.total}
      filters={
        <AdminFilterPills
          options={STATUS_FILTERS}
          value={status}
          onChange={(value) => {
            setStatus(value);
            resetPage();
          }}
        />
      }
    />
  );

  async function handleConfirm() {
    if (!confirm) return;
    try {
      if (confirm.type === 'delete') {
        await deleteRoute.mutateAsync(confirm.route.id);
        setBanner({ tone: 'success', message: `"${confirm.route.title}" was deleted.` });
      } else if (confirm.type === 'flag') {
        await moderateRoute.mutateAsync({ routeId: confirm.route.id, status: 'flagged' });
        setBanner({ tone: 'success', message: `"${confirm.route.title}" was flagged.` });
      }
      setConfirm(null);
    } catch (err) {
      setConfirm((prev) => ({ ...prev, error: err?.message || 'Action failed.' }));
    }
  }

  const rowProps = {
    onFlag: (route) => setConfirm({ type: 'flag', route, error: null }),
    onDelete: (route) => setConfirm({ type: 'delete', route, error: null }),
    pending,
  };

  let body;
  if (isLoading) {
    body = <Loader />;
  } else if (isError) {
    body = <AdminErrorState message={error?.message || 'Failed to load routes.'} />;
  } else if (routes.length === 0) {
    body = <AdminEmptyState title="No routes found" />;
  } else if (variant === 'mobile') {
    body = (
      <div className="space-y-2">
        {routes.map((route) => (
          <RouteRowBold key={route.id} route={route} {...rowProps} />
        ))}
      </div>
    );
  } else {
    body = (
      <Card>
        <div className="space-y-3">
          {routes.map((route) => (
            <RouteRowDesktop key={route.id} route={route} {...rowProps} />
          ))}
        </div>
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
      {variant === 'mobile' && !isLoading && !isError && routes.length > 0 ? (
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
        title={confirm?.type === 'delete' ? 'Delete route' : 'Flag route'}
        message={
          confirm?.type === 'delete'
            ? `Permanently delete "${confirm.route.title}"? This cannot be undone.`
            : confirm
              ? `Flag "${confirm.route.title}" for review?`
              : ''
        }
        confirmLabel={confirm?.type === 'delete' ? 'Delete route' : 'Flag route'}
        variant={confirm?.type === 'delete' ? 'danger' : 'primary'}
        isPending={pending}
        error={confirm?.error}
      />
    </>
  );
}
