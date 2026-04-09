import Card from '@/shared/components/ui/card/Card';

export default function AdminStatsCards() {
  const items = [
    ['Users', '218'],
    ['Routes', '64'],
    ['Live hazards', '11'],
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map(([label, value]) => (
        <Card key={label}>
          <p className="text-sm text-white/44">{label}</p>
          <p className="mt-3 text-3xl font-semibold">{value}</p>
        </Card>
      ))}
    </div>
  );
}
