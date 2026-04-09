import Card from '@/shared/components/ui/card/Card';

export default function RideSummaryStats() {
  const items = [
    ['Total rides', '27'],
    ['Distance this month', '126 km'],
    ['Group rides', '09'],
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
