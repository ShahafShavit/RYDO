import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AdminPageShell from '@/features/admin/components/AdminPageShell';
import AdminRefreshButton from '@/features/admin/components/AdminRefreshButton';
import AdminEngagementPanel from '@/features/admin/components/AdminEngagementPanel';
import { refreshAdminEngagementAnalytics } from '@/features/admin/hooks/useAdminEngagementAnalytics';

export default function AdminAnalyticsPage() {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(7);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshAdminEngagementAnalytics(queryClient, days);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <AdminPageShell
      title="Analytics"
      eyebrow="Engagement"
      description="DAU, WAU, MAU, signups, and UTC usage patterns."
      headerActions={<AdminRefreshButton onRefresh={handleRefresh} isRefreshing={refreshing} />}
      desktop={<AdminEngagementPanel variant="desktop" days={days} onDaysChange={setDays} />}
      mobile={<AdminEngagementPanel variant="mobile" days={days} onDaysChange={setDays} />}
    />
  );
}
