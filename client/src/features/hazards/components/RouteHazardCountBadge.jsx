import { AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export default function RouteHazardCountBadge({ count, className }) {
  if (count == null) return null;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-100',
        className,
      )}
      title={`${count} reported hazard${count === 1 ? '' : 's'} on this route`}
    >
      <AlertTriangle className="h-3.5 w-3.5 text-[var(--rydo-amber)]" strokeWidth={2} aria-hidden />
      {count}
    </span>
  );
}
