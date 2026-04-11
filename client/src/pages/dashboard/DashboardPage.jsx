import DashboardHeader from '@/features/dashboard/components/DashboardHeader';
import DashboardHomeCards from '@/features/dashboard/components/DashboardHomeCards';
import DashboardStats from '@/features/dashboard/components/DashboardStats';

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <DashboardHeader />
      <DashboardStats />
      <DashboardHomeCards />
    </section>
  );
}
