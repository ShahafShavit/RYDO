import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AdminPageShell from '@/features/admin/components/AdminPageShell';
import AdminStatGrid from '@/features/admin/components/AdminStatGrid';
import AdminStatGridBold from '@/features/admin/components/AdminStatGridBold';
import AdminRefreshButton from '@/features/admin/components/AdminRefreshButton';
import { refreshAdminSummary } from '@/features/admin/hooks/useAdminSummary';

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshAdminSummary(queryClient);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <AdminPageShell
      title="Dashboard"
      eyebrow="Control"
      description="Platform overview and quick links to moderation tools."
      headerActions={<AdminRefreshButton onRefresh={handleRefresh} isRefreshing={refreshing} />}
      desktop={<AdminStatGrid />}
      mobile={<AdminStatGridBold />}
    />
  );
}
