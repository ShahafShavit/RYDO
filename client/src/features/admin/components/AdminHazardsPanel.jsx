import { useState } from 'react';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import Loader from '@/shared/components/feedback/Loader';
import { useAdminHazards, useUpdateHazardStatus } from '@/features/admin/hooks/useAdminHazards';
import AdminToolbar, { AdminFilterPills } from '@/features/admin/components/AdminToolbar';
import AdminPagination from '@/features/admin/components/AdminPagination';
import AdminConfirmModal from '@/features/admin/components/AdminConfirmModal';
import AdminStatusPill from '@/features/admin/components/AdminStatusPill';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminErrorState from '@/features/admin/components/AdminErrorState';
import AdminInlineBanner from '@/features/admin/components/AdminInlineBanner';

const STATUS_FILTERS = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Resolved', value: 'resolved' },
];

const SEVERITY_FILTERS = [
  { label: 'All severity', value: '' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

function HazardRowDesktop({ hazard, onResolve, pending }) {
  return (
    <div className="rounded-2xl border border-border bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium capitalize">{hazard.type}</p>
          <p className="mt-1 text-sm text-fg-muted">
            {hazard.reportedBy?.fullName || 'Unknown'} · {hazard.location?.region || 'Unknown region'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminStatusPill label={hazard.severity} />
          <AdminStatusPill label={hazard.status} />
        </div>
      </div>
      {hazard.description ? <p className="mt-3 text-sm text-fg-muted">{hazard.description}</p> : null}
      <div className="mt-4">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onResolve(hazard)}
          disabled={pending || hazard.status === 'resolved'}
        >
          Resolve
        </Button>
      </div>
    </div>
  );
}

function HazardRowBold({ hazard, onResolve, pending }) {
  return (
    <div className="rydo-bold-glass-row px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium capitalize">{hazard.type}</p>
          <p className="mt-1 text-sm text-fg-muted">{hazard.reportedBy?.fullName || 'Unknown reporter'}</p>
          <p className="mt-1 text-xs text-fg-subtle">{hazard.location?.region || 'Unknown region'}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <AdminStatusPill label={hazard.severity} />
          <AdminStatusPill label={hazard.status} />
        </div>
      </div>
      {hazard.description ? <p className="mt-2 text-sm text-fg-muted">{hazard.description}</p> : null}
      <div className="mt-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onResolve(hazard)}
          disabled={pending || hazard.status === 'resolved'}
        >
          Resolve
        </Button>
      </div>
    </div>
  );
}

export default function AdminHazardsPanel({ variant = 'desktop' }) {
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(20);
  const [confirm, setConfirm] = useState(null);
  const [banner, setBanner] = useState(null);

  const { hazards, pagination, isLoading, isError, error } = useAdminHazards({
    skip,
    take,
    status,
    severity,
  });
  const updateStatus = useUpdateHazardStatus();

  function resetPage() {
    setSkip(0);
  }

  const toolbar = (
    <AdminToolbar
      total={pagination.total}
      filters={
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <AdminFilterPills
            options={STATUS_FILTERS}
            value={status}
            onChange={(value) => {
              setStatus(value);
              resetPage();
            }}
          />
          <AdminFilterPills
            options={SEVERITY_FILTERS}
            value={severity}
            onChange={(value) => {
              setSeverity(value);
              resetPage();
            }}
          />
        </div>
      }
    />
  );

  async function handleConfirm() {
    if (!confirm) return;
    try {
      await updateStatus.mutateAsync({ hazardId: confirm.hazard.id, status: 'resolved' });
      setBanner({ tone: 'success', message: 'Hazard marked as resolved.' });
      setConfirm(null);
    } catch (err) {
      setConfirm((prev) => ({ ...prev, error: err?.message || 'Action failed.' }));
    }
  }

  const rowProps = {
    onResolve: (hazard) => setConfirm({ hazard, error: null }),
    pending: updateStatus.isPending,
  };

  let body;
  if (isLoading) {
    body = <Loader />;
  } else if (isError) {
    body = <AdminErrorState message={error?.message || 'Failed to load hazards.'} />;
  } else if (hazards.length === 0) {
    body = <AdminEmptyState title="No hazards found" />;
  } else if (variant === 'mobile') {
    body = (
      <div className="space-y-2">
        {hazards.map((hazard) => (
          <HazardRowBold key={hazard.id} hazard={hazard} {...rowProps} />
        ))}
      </div>
    );
  } else {
    body = (
      <Card>
        <div className="space-y-3">
          {hazards.map((hazard) => (
            <HazardRowDesktop key={hazard.id} hazard={hazard} {...rowProps} />
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
      {variant === 'mobile' && !isLoading && !isError && hazards.length > 0 ? (
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
        title="Resolve hazard"
        message={confirm ? `Mark this ${confirm.hazard.type} hazard as resolved?` : ''}
        confirmLabel="Resolve"
        variant="primary"
        isPending={updateStatus.isPending}
        error={confirm?.error}
      />
    </>
  );
}
