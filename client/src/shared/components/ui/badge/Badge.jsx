import { cn } from '@/shared/lib/cn';

export default function Badge({ children, className, variant = 'default' }) {
  const styles = {
    default: 'border-border bg-surface text-fg',
    neon: 'border-rydo-purple/35 bg-rydo-purple/10 text-fg shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--rydo-text)_10%,transparent)]',
    success:
      'border-rydo-green/30 bg-rydo-green/10 text-fg shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--rydo-text)_10%,transparent)]',
    warning:
      'border-amber-500/40 bg-amber-500/12 text-amber-50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
