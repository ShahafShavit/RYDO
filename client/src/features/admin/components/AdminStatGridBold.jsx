import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import StatRibbon from '@/shared/components/bold/StatRibbon';
import { useAdminSummary } from '@/features/admin/hooks/useAdminSummary';
import AdminErrorState from '@/features/admin/components/AdminErrorState';

const ROWS = [
  { key: 'totalUsers', label: 'Users', to: ROUTES.adminUsers },
  { key: 'totalRoutes', label: 'Routes', to: ROUTES.adminRoutes },
  { key: 'liveHazards', label: 'Live hazards', to: ROUTES.adminHazards },
  { key: 'activeQuests', label: 'Active quests', to: ROUTES.adminChallenges },
  { key: 'activeModifiers', label: 'Active modifiers', to: ROUTES.adminChallenges },
  { key: 'questCompletionsThisWeek', label: 'Completions (7d)', to: ROUTES.adminChallenges },
];

export default function AdminStatGridBold() {
  const { data, isLoading, isError, error } = useAdminSummary();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-16 rounded-[28px] bg-surface-strong" />
        <div className="h-14 rounded-[28px] bg-surface-strong" />
        <div className="h-14 rounded-[28px] bg-surface-strong" />
      </div>
    );
  }

  if (isError) return <AdminErrorState message={error?.message || 'Could not load admin statistics.'} />;

  const ribbonItems = [
    { key: 'users', label: 'Users', value: data?.totalUsers ?? 0 },
    { key: 'routes', label: 'Routes', value: data?.totalRoutes ?? 0 },
    { key: 'hazards', label: 'Hazards', value: data?.liveHazards ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <StatRibbon items={ribbonItems} paddingClass="px-0 py-2" />

      <div className="space-y-2">
        {ROWS.map((row) => (
          <Link
            key={row.key}
            to={row.to}
            className="rydo-bold-glass-row flex items-center justify-between gap-3 px-4 py-3.5"
          >
            <div className="min-w-0">
              <p className="text-sm text-fg-muted">{row.label}</p>
              <p className="rydo-tnum text-xl font-semibold">{String(data?.[row.key] ?? '0')}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-fg-subtle" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  );
}
