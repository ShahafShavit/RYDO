import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Map,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import Card from '@/shared/components/ui/card/Card';
import AdminEngagementKpiRow from '@/features/admin/components/AdminEngagementKpiRow';
import { useAdminSummary } from '@/features/admin/hooks/useAdminSummary';
import Loader from '@/shared/components/feedback/Loader';
import AdminErrorState from '@/features/admin/components/AdminErrorState';

const STAT_CONFIG = [
  {
    key: 'totalUsers',
    label: 'Users',
    icon: Users,
    to: ROUTES.adminUsers,
    accent: 'text-rydo-purple',
  },
  {
    key: 'totalRoutes',
    label: 'Routes',
    icon: Map,
    to: ROUTES.adminRoutes,
    accent: 'text-cyan-300',
  },
  {
    key: 'liveHazards',
    label: 'Live hazards',
    icon: AlertTriangle,
    to: ROUTES.adminHazards,
    accent: 'text-amber-300',
  },
  {
    key: 'activeQuests',
    label: 'Active quests',
    icon: Target,
    to: ROUTES.adminChallenges,
    accent: 'text-emerald-300',
  },
  {
    key: 'activeModifiers',
    label: 'Active modifiers',
    icon: Zap,
    to: ROUTES.adminChallenges,
    accent: 'text-violet-300',
  },
  {
    key: 'questCompletionsThisWeek',
    label: 'Quest completions (7d)',
    icon: Trophy,
    to: ROUTES.adminChallenges,
    accent: 'text-rydo-green',
  },
];

function StatCard({ stat, value }) {
  const Icon = stat.icon;
  const inner = (
    <Card className="group transition-[box-shadow,transform] hover:shadow-[0_0_32px_color-mix(in_srgb,var(--rydo-purple)_12%,transparent)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-fg-subtle">{stat.label}</p>
          <p className="rydo-tnum mt-3 text-3xl font-semibold">{String(value ?? '0')}</p>
        </div>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-strong ${stat.accent}`}>
          <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
        </span>
      </div>
    </Card>
  );

  if (stat.to) {
    return (
      <Link to={stat.to} className="block rounded-[28px] focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple">
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function AdminStatGrid() {
  const { data, isLoading, isError, error } = useAdminSummary();

  if (isLoading) return <Loader />;
  if (isError) return <AdminErrorState message={error?.message || 'Could not load admin statistics.'} />;

  return (
    <div className="space-y-6">
      <AdminEngagementKpiRow data={data} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {STAT_CONFIG.map((stat) => (
          <StatCard key={stat.key} stat={stat} value={data?.[stat.key]} />
        ))}
      </div>
    </div>
  );
}
