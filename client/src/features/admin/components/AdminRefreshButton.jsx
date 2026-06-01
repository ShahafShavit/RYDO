import { RefreshCw } from 'lucide-react';
import Button from '@/shared/components/ui/button/Button';
import { cn } from '@/shared/lib/cn';

export default function AdminRefreshButton({ onRefresh, isRefreshing = false, className = '' }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className={cn('gap-2', className)}
      onClick={onRefresh}
      disabled={isRefreshing}
      aria-busy={isRefreshing}
    >
      <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} aria-hidden />
      Refresh
    </Button>
  );
}
