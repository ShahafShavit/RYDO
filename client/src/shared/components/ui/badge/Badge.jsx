import { cn } from '@/shared/lib/cn';

export default function Badge({ children, className, variant = 'default' }) {
  const styles = {
    default: 'border-border bg-surface text-fg',
    neon: 'border-rydo-purple/40 bg-rydo-purple/10 text-fg shadow-[0_0_18px_color-mix(in_srgb,var(--rydo-purple)_16%,transparent)]',
    success: 'border-rydo-green/35 bg-rydo-green/10 text-fg shadow-[0_0_18px_color-mix(in_srgb,var(--rydo-green)_14%,transparent)]',
    warning:
      'border-amber-500/45 bg-amber-500/12 text-amber-50 shadow-[0_0_14px_rgba(245,158,11,0.12)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-xl',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
