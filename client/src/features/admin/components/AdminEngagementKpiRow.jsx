import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import Card from '@/shared/components/ui/card/Card';
import {
  adminDeltaTone,
  formatAdminDeltaPct,
} from '@/features/admin/utils/admin-engagement-formatters';
import { cn } from '@/shared/lib/cn';

function DeltaBadge({ label, value }) {
  return (
    <span className={cn('rydo-tnum text-xs font-medium', adminDeltaTone(value))}>
      {label} {formatAdminDeltaPct(value)}
    </span>
  );
}

function EngagementCard({ label, value, deltaLabel, deltaValue, accent = 'text-rydo-purple' }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-fg-subtle">{label}</p>
          <p className="rydo-tnum mt-2 text-3xl font-semibold">{String(value ?? '0')}</p>
          {deltaLabel ? (
            <p className="mt-2">
              <DeltaBadge label={deltaLabel} value={deltaValue} />
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-strong',
            accent,
          )}
        >
          <span className="text-lg font-semibold leading-none">{label.charAt(0)}</span>
        </span>
      </div>
    </Card>
  );
}

export default function AdminEngagementKpiRow({ data, showAnalyticsLink = true }) {
  const deltas = data?.deltas ?? {};

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Engagement</p>
          <p className="text-sm text-fg-muted">UTC activity from authenticated app usage</p>
        </div>
        {showAnalyticsLink ? (
          <Link
            to={ROUTES.adminAnalytics}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-rydo-purple hover:underline"
          >
            View analytics
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EngagementCard
          label="DAU"
          value={data?.dau}
          deltaLabel="WoW"
          deltaValue={deltas.dauWoWPct}
          accent="text-rydo-green"
        />
        <EngagementCard
          label="WAU"
          value={data?.wau}
          deltaLabel="WoW"
          deltaValue={deltas.wauWoWPct}
          accent="text-cyan-300"
        />
        <EngagementCard
          label="MAU"
          value={data?.mau}
          deltaLabel="MoM"
          deltaValue={deltas.mauMoMPct}
          accent="text-violet-300"
        />
        <EngagementCard
          label="Active now"
          value={data?.activeNow}
          accent="text-amber-300"
        />
      </div>
    </div>
  );
}

export function AdminEngagementKpiBold({ data, showAnalyticsLink = true }) {
  const deltas = data?.deltas ?? {};
  const items = [
    { key: 'dau', label: 'DAU', value: data?.dau ?? 0, delta: deltas.dauWoWPct, deltaLabel: 'WoW' },
    { key: 'wau', label: 'WAU', value: data?.wau ?? 0, delta: deltas.wauWoWPct, deltaLabel: 'WoW' },
    { key: 'mau', label: 'MAU', value: data?.mau ?? 0, delta: deltas.mauMoMPct, deltaLabel: 'MoM' },
    { key: 'activeNow', label: 'Now', value: data?.activeNow ?? 0 },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Engagement</p>
        {showAnalyticsLink ? (
          <Link to={ROUTES.adminAnalytics} className="text-xs font-medium text-rydo-purple">
            Analytics →
          </Link>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.key} className="rydo-bold-glass-row px-3 py-3">
            <p className="text-xs text-fg-muted">{item.label}</p>
            <p className="rydo-tnum text-xl font-semibold">{String(item.value)}</p>
            {item.deltaLabel ? (
              <p className={cn('rydo-tnum mt-1 text-[11px] font-medium', adminDeltaTone(item.delta))}>
                {item.deltaLabel} {formatAdminDeltaPct(item.delta)}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
