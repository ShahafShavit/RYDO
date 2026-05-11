import { cn } from '@/shared/lib/cn';

export default function Badge({ children, className, variant = 'default' }) {
  const styles = {
    default: 'border-border bg-surface text-fg',
    neon: 'border-rydo-purple/35 bg-rydo-purple/10 text-fg shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--rydo-text)_10%,transparent)]',
    success:
      'border-rydo-green/30 bg-rydo-green/10 text-fg shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--rydo-text)_10%,transparent)]',
    warning:
      'border-amber-500/40 bg-amber-500/12 text-amber-50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
    /** Route / trail name chips — distinct from status (neon) and club (success). */
    route:
      'border-sky-500/35 bg-sky-500/12 text-fg shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--rydo-text)_8%,transparent)]',
    /** Personal / non-club rides — distinct from club (success) and route (sky). */
    personal:
      'border-violet-500/35 bg-violet-500/12 text-fg shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--rydo-text)_8%,transparent)]',
  };

  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center justify-center gap-2 rounded-full border px-4 py-1.5 text-center text-xs font-medium',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
