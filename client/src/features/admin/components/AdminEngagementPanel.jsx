import Card from '@/shared/components/ui/card/Card';
import AdminTrendChart from '@/shared/components/charts/AdminTrendChart';
import AdminActivityHeatmap from '@/shared/components/charts/AdminActivityHeatmap';
import AdminEngagementKpiRow from '@/features/admin/components/AdminEngagementKpiRow';
import { AdminEngagementKpiBold } from '@/features/admin/components/AdminEngagementKpiRow';
import AdminErrorState from '@/features/admin/components/AdminErrorState';
import Loader from '@/shared/components/feedback/Loader';
import { useAdminEngagementAnalytics } from '@/features/admin/hooks/useAdminEngagementAnalytics';
import {
  adminDeltaTone,
  formatAdminDeltaPct,
} from '@/features/admin/utils/admin-engagement-formatters';
import { cn } from '@/shared/lib/cn';

const RANGE_OPTIONS = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
];

function RangeToggle({ days, onChange }) {
  return (
    <div className="inline-flex rounded-2xl border border-border bg-surface-strong p-1">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.days}
          type="button"
          onClick={() => onChange(opt.days)}
          className={cn(
            'rydo-tnum rounded-xl px-3 py-1.5 text-sm font-medium transition-colors',
            days === opt.days ? 'bg-rydo-purple/20 text-fg' : 'text-fg-muted hover:text-fg',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, className = '' }) {
  return (
    <Card className={className}>
      <p className="text-sm text-fg-subtle">{label}</p>
      <p className="rydo-tnum mt-2 text-2xl font-semibold">{String(value ?? '0')}</p>
    </Card>
  );
}

function CompositionRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-strong px-4 py-3">
      <p className="text-sm text-fg-muted">{label}</p>
      <p className="rydo-tnum text-lg font-semibold">{String(value ?? '0')}</p>
    </div>
  );
}

export default function AdminEngagementPanel({ variant = 'desktop', days = 7, onDaysChange }) {
  const { data, isLoading, isError, error } = useAdminEngagementAnalytics(days);

  if (isLoading) return <Loader />;
  if (isError) return <AdminErrorState message={error?.message || 'Could not load engagement analytics.'} />;

  const deltas = data?.deltas ?? {};
  const isMobile = variant === 'mobile';

  const headline = isMobile ? (
    <AdminEngagementKpiBold data={data} showAnalyticsLink={false} />
  ) : (
    <AdminEngagementKpiRow data={data} showAnalyticsLink={false} />
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeToggle days={days} onChange={onDaysChange} />
        {data?.stickinessPct != null ? (
          <p className="rydo-tnum text-sm text-fg-muted">
            Stickiness {data.stickinessPct}%
            <span className="mx-2 text-fg-subtle">·</span>
            DAU/WAU/MoM{' '}
            <span className={adminDeltaTone(deltas.dauWoWPct)}>{formatAdminDeltaPct(deltas.dauWoWPct)}</span>
            {' / '}
            <span className={adminDeltaTone(deltas.wauWoWPct)}>{formatAdminDeltaPct(deltas.wauWoWPct)}</span>
            {' / '}
            <span className={adminDeltaTone(deltas.mauMoMPct)}>{formatAdminDeltaPct(deltas.mauMoMPct)}</span>
          </p>
        ) : null}
      </div>

      {headline}

      <div className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-3')}>
        <StatCard label="Signups today" value={data?.signups?.today} />
        <StatCard label="Signups (7d)" value={data?.signups?.last7Days} />
        <StatCard label="Signups (30d)" value={data?.signups?.last30Days} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Active users (30d)</p>
        <CompositionRow label="Returning" value={data?.returningActive30d} />
        <CompositionRow label="New" value={data?.newActive30d} />
      </div>

      <AdminTrendChart
        title="Daily active users"
        series={data?.dailyActiveUsers ?? []}
        valueLabel="users"
        accentClass="text-rydo-green"
      />

      <AdminTrendChart
        title="Daily signups"
        series={data?.dailySignups ?? []}
        valueLabel="signups"
        accentClass="text-cyan-300"
      />

      <AdminActivityHeatmap heatmap={data?.activityHeatmap} />
    </div>
  );
}
