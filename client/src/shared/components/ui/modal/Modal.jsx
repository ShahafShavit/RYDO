import Card from '@/shared/components/ui/card/Card';

export default function Modal({ title = 'Modal', children }) {
  return (
    <div className="fixed inset-0 z-(--rydo-z-modal) grid place-items-center bg-black/50 p-6 backdrop-blur-sm">
      <Card className="w-full max-w-lg">
        <h3 className="mb-4 text-xl font-semibold">{title}</h3>
        {children}
      </Card>
    </div>
  );
}
