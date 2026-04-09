import Card from '@/shared/components/ui/card/Card';

export default function EmptyState({ title = 'No data yet', description = 'There is nothing to display here right now.' }) {
  return (
    <Card className="border-dashed text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-white/64">{description}</p>
    </Card>
  );
}
