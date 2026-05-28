import DashboardHeader from '@/features/dashboard/components/DashboardHeader';
import DashboardHomeCards from '@/features/dashboard/components/DashboardHomeCards';

export default function DashboardPage() {
  return (
    <section className="min-w-0 space-y-6">
      <DashboardHeader />
      <DashboardHomeCards />
    </section>
  );
}
