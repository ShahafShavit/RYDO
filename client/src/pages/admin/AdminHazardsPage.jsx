import AdminPageShell from '@/features/admin/components/AdminPageShell';
import AdminHazardsPanel from '@/features/admin/components/AdminHazardsPanel';

export default function AdminHazardsPage() {
  return (
    <AdminPageShell
      title="Hazards"
      description="Monitor trail hazards and resolve reports."
      desktop={<AdminHazardsPanel variant="desktop" />}
      mobile={<AdminHazardsPanel variant="mobile" />}
    />
  );
}
