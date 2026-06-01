import Card from '@/shared/components/ui/card/Card';

export default function AdminErrorState({ message = 'Something went wrong.' }) {
  return (
    <>
      <Card className="hidden border-red-500/40 bg-red-500/10 md:block">
        <p className="text-sm text-red-200">{message}</p>
      </Card>
      <div className="rounded-[28px] border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 md:hidden">
        {message}
      </div>
    </>
  );
}
