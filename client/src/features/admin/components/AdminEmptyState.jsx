import Card from '@/shared/components/ui/card/Card';

export default function AdminEmptyState({ title = 'Nothing here yet', message = 'Try adjusting your filters.' }) {
  return (
    <>
      <Card className="hidden text-center md:block">
        <p className="font-medium">{title}</p>
        <p className="mt-2 text-sm text-fg-muted">{message}</p>
      </Card>
      <div className="rydo-bold-glass-row flex flex-col items-center justify-center px-4 py-8 text-center md:hidden">
        <p className="font-medium">{title}</p>
        <p className="mt-2 text-sm text-fg-muted">{message}</p>
      </div>
    </>
  );
}
