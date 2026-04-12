import { cn } from '@/shared/lib/cn';

const variants = {
  primary:
    'text-fg border border-border-strong bg-surface-strong shadow-[inset_0_1px_0_color-mix(in_srgb,var(--rydo-text)_18%,transparent),0_8px_30px_color-mix(in_srgb,var(--rydo-purple)_22%,transparent)] hover:border-rydo-purple/50 hover:shadow-[0_0_30px_color-mix(in_srgb,var(--rydo-purple)_30%,transparent)]',
  secondary:
    'text-fg border border-border bg-surface hover:bg-surface-strong hover:border-border-strong',
  neon:
    'text-fg border border-rydo-purple/45 bg-rydo-purple/14 shadow-[0_0_36px_color-mix(in_srgb,var(--rydo-purple)_26%,transparent)] hover:bg-rydo-purple/18',
  success:
    'text-fg border border-rydo-green/35 bg-rydo-green/10 shadow-[0_0_32px_color-mix(in_srgb,var(--rydo-green)_20%,transparent)] hover:bg-rydo-green/15',
  ghost:
    'text-fg hover:bg-surface',
};

const sizes = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full backdrop-blur-xl transition duration-300 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
