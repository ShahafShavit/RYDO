import Card from '@/shared/components/ui/card/Card';

export default function RideMembersList() {
  const members = ['Sam', 'Noa', 'Eden', 'Matan', 'Yael'];

  return (
    <Card>
      <h3 className="text-lg font-semibold">Ride members</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {members.map((member) => (
          <span key={member} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/72">{member}</span>
        ))}
      </div>
    </Card>
  );
}
