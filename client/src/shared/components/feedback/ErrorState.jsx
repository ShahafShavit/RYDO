import Card from '@/shared/components/ui/card/Card';

export default function ErrorState({ title = 'Something went wrong', description = 'Please try again later.' }) {
  return (
    <Card className="border-red-500/20 bg-red-500/6 text-center">
      <h3 className="text-lg font-semibold text-red-200">{title}</h3>
      <p className="mt-2 text-red-200/80">{description}</p>
    </Card>
  );
}
