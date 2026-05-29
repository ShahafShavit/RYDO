import DashboardHeader from '@/features/dashboard/components/DashboardHeader';
import DashboardHomeCards from '@/features/dashboard/components/DashboardHomeCards';
import DashboardHomeCardsBold from '@/features/dashboard/components/DashboardHomeCardsBold';

export default function DashboardPage() {
  return (
    <>
      <section className="hidden min-w-0 space-y-6 md:block">
        <DashboardHeader />
        <DashboardHomeCards />
      </section>
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <DashboardHomeCardsBold />
      </div>
    </>
  );
}
