import { MapPinned } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * Same outer frame as {@link CompactRouteMapPreview} for cards with no linked route / preview polyline.
 */
export default function CompactRouteMapPlaceholder({ className, compact = false }) {
  return (
    <div
      role="img"
      aria-label="No route yet"
      className={cn(
        'relative flex h-28 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface via-surface to-rydo-purple/12',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-12deg, transparent, transparent 10px, rgba(255,255,255,0.04) 10px, rgba(255,255,255,0.04) 11px)',
        }}
        aria-hidden
      />
      <MapPinned
        className={cn('relative z-[1] text-fg/38', compact ? 'h-5 w-5' : 'h-8 w-8')}
        strokeWidth={1.25}
        aria-hidden
      />
      <span
        className={cn(
          'relative z-[1] mt-1 text-center font-medium tracking-wide text-fg-subtle',
          compact ? 'max-w-[4.5rem] px-0.5 text-[9px] leading-tight' : 'text-[11px]',
        )}
      >
        No route yet
      </span>
    </div>
  );
}
