import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import AdminStatusPill from '@/features/admin/components/AdminStatusPill';
import AdminPagination from '@/features/admin/components/AdminPagination';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import Loader from '@/shared/components/feedback/Loader';

function InstanceRowDesktop({ row, onSelect, onEndEarly, onFeature, selected }) {
  return (
    <tr className={`border-t border-border ${selected ? 'bg-rydo-purple/8' : ''}`}>
      <td className="px-4 py-3 font-medium">
        {row.title}
        {row.isFeatured ? (
          <span className="ml-2 inline-block">
            <AdminStatusPill label="Featured" tone="medium" />
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3 capitalize">{row.kind}</td>
      <td className="px-4 py-3">
        <AdminStatusPill label={row.status} />
      </td>
      <td className="px-4 py-3 rydo-tnum">{row.completionCount}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => onSelect(row.id)}>
            Progress
          </Button>
          {row.status === 'Published' ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => onEndEarly(row)}>
                End early
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onFeature(row)}>
                Feature
              </Button>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function InstanceRowBold({ row, onSelect, onEndEarly, onFeature, selected }) {
  return (
    <div className={`rydo-bold-glass-row px-4 py-3.5 ${selected ? 'ring-1 ring-rydo-purple/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{row.title}</p>
          <p className="mt-1 text-sm capitalize text-fg-muted">{row.kind}</p>
        </div>
        <AdminStatusPill label={row.status} />
      </div>
      <p className="rydo-tnum mt-2 text-xs text-fg-subtle">{row.completionCount} completions</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => onSelect(row.id)}>
          Progress
        </Button>
        {row.status === 'Published' ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => onEndEarly(row)}>
              End early
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onFeature(row)}>
              Feature
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ProgressPanel({
  variant,
  selectedId,
  progressQuery,
  progressSkip,
  progressTake,
  onProgressSkipChange,
  onProgressTakeChange,
}) {
  const panel = (
    <>
      <h2 className="text-sm font-semibold">Rider progress</h2>
      {selectedId == null ? (
        <p className="mt-2 text-sm text-fg-muted">Select an instance to view progress.</p>
      ) : progressQuery.isLoading ? (
        <Loader className="mt-3" />
      ) : (progressQuery.data?.items ?? []).length === 0 ? (
        <AdminEmptyState title="No progress yet" message="Riders haven't started this challenge." />
      ) : (
        <>
          <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto text-sm">
            {(progressQuery.data?.items ?? []).map((p) => (
              <li
                key={`${p.userId}-${p.handle}`}
                className="flex justify-between gap-2 rounded-xl border border-border px-3 py-2"
              >
                <span>{p.displayName || p.handle || `#${p.userId}`}</span>
                <span className="rydo-tnum text-fg-muted">{p.progressPercent}%</span>
              </li>
            ))}
          </ul>
          <AdminPagination
            className="mt-3"
            skip={progressSkip}
            take={progressTake}
            total={progressQuery.data?.total ?? 0}
            onPageChange={onProgressSkipChange}
            onPageSizeChange={onProgressTakeChange}
          />
        </>
      )}
    </>
  );

  if (variant === 'mobile') {
    return <div className="rydo-bold-glass-row mt-4 px-4 py-3.5">{panel}</div>;
  }

  return <Card>{panel}</Card>;
}

export default function AdminChallengeInstancesView({
  variant = 'desktop',
  instancesQuery,
  statusFilter,
  onStatusFilterChange,
  skip,
  take,
  onSkipChange,
  onTakeChange,
  selectedId,
  onSelect,
  onEndEarly,
  onFeature,
  progressQuery,
  progressSkip,
  onProgressSkipChange,
  progressTake,
  onProgressTakeChange,
}) {
  const items = instancesQuery.data?.items ?? [];
  const total = instancesQuery.data?.total ?? 0;

  const statusFilters = (
    <div className="flex flex-wrap gap-2">
      {[
        { label: 'All', value: '' },
        { label: 'Published', value: 'Published' },
        { label: 'Ended', value: 'Ended' },
        { label: 'Draft', value: 'Draft' },
      ].map((opt) => (
        <button
          key={opt.value || 'all'}
          type="button"
          onClick={() => onStatusFilterChange(opt.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            statusFilter === opt.value ? 'bg-rydo-purple/20 text-fg' : 'bg-surface-strong text-fg-muted'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  if (instancesQuery.isLoading) return <Loader />;

  if (items.length === 0) {
    return (
      <>
        {statusFilters}
        <div className="mt-4">
          <AdminEmptyState title="No challenge instances" />
        </div>
      </>
    );
  }

  const progressPanel = (
    <ProgressPanel
      variant={variant}
      selectedId={selectedId}
      progressQuery={progressQuery}
      progressSkip={progressSkip}
      progressTake={progressTake}
      onProgressSkipChange={onProgressSkipChange}
      onProgressTakeChange={onProgressTakeChange}
    />
  );

  if (variant === 'mobile') {
    return (
      <div className="space-y-2">
        {statusFilters}
        {items.map((row) => (
          <InstanceRowBold
            key={row.id}
            row={row}
            selected={selectedId === row.id}
            onSelect={onSelect}
            onEndEarly={onEndEarly}
            onFeature={onFeature}
          />
        ))}
        <AdminPagination skip={skip} take={take} total={total} onPageChange={onSkipChange} onPageSizeChange={onTakeChange} />
        {progressPanel}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <div className="mb-4">{statusFilters}</div>
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-strong text-fg-muted">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Done</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <InstanceRowDesktop
                  key={row.id}
                  row={row}
                  selected={selectedId === row.id}
                  onSelect={onSelect}
                  onEndEarly={onEndEarly}
                  onFeature={onFeature}
                />
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination
          className="mt-4"
          skip={skip}
          take={take}
          total={total}
          onPageChange={onSkipChange}
          onPageSizeChange={onTakeChange}
        />
      </Card>
      {progressPanel}
    </div>
  );
}
