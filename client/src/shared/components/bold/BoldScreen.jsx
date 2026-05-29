import { cn } from '@/shared/lib/cn';

/** Full-bleed Bold mobile shell — gradient fills viewport above tab bar (desktop unaffected). */
export default function BoldScreen({ children, className, hero }) {
  return (
    <div
      className={cn(
        'rydo-bold-screen flex min-h-[var(--rydo-bold-screen-min-h)] flex-1 flex-col overflow-hidden md:min-h-0',
        className,
      )}
    >
      {hero}
      {children}
    </div>
  );
}

/** Decorative route canvas band at top of Bold screens. */
export function BoldHeroCanvas({ children, heightClass = 'h-[230px]', opacityClass = 'opacity-50' }) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden', heightClass, opacityClass)}
      aria-hidden
    >
      {children}
      <div className="rydo-hero-fade" />
    </div>
  );
}
