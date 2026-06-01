import AdminPageShell from '@/features/admin/components/AdminPageShell';
import AdminChallengesPanel from '@/features/admin/components/AdminChallengesPanel';

export default function AdminChallengesPage() {
  return (
    <AdminPageShell
      title="Challenges season"
      description="Publish quests and modifiers, review templates, and track rider progress."
      desktop={<AdminChallengesPanel variant="desktop" />}
      mobile={<AdminChallengesPanel variant="mobile" />}
    />
  );
}
