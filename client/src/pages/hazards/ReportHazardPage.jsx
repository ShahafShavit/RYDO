import HazardReportForm from '@/features/hazards/components/HazardReportForm';
import HazardCard from '@/features/hazards/components/HazardCard';
import { useHazardsList } from '@/features/hazards/hooks/useHazardsList';

export default function ReportHazardPage() {
  const { hazards } = useHazardsList();

  return (
    <section className="space-y-6">
      <HazardReportForm />
      <div className="grid gap-4 lg:grid-cols-2">
        {hazards.map((hazard) => <HazardCard key={hazard.id} hazard={hazard} />)}
      </div>
    </section>
  );
}
