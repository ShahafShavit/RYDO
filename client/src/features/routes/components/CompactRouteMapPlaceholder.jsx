import { MapPinned } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * Same outer frame as {@link CompactRouteMapPreview} for scheduled ride cards with no linked route.
 */
export default function CompactRouteMapPlaceholder({ className }) {
  return (
    <div
      role="img"
      aria-label="No route linked"
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
      <MapPinned className="relative z-[1] h-8 w-8 text-fg/38" strokeWidth={1.25} aria-hidden />
      <span className="relative z-[1] mt-1 text-[11px] font-medium tracking-wide text-fg-subtle">
        No route linked
      </span>
    </div>
  );
}
