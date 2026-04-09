import DashboardHeader from '@/features/dashboard/components/DashboardHeader';
import DashboardHomeCards from '@/features/dashboard/components/DashboardHomeCards';

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <DashboardHeader />
      <DashboardHomeCards />
    </section>
  );
}
