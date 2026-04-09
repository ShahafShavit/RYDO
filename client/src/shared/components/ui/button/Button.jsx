import { cn } from '@/shared/lib/cn';

const variants = {
  primary:
    'text-white border border-white/15 bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_30px_rgba(123,92,255,0.18)] hover:border-[#7B5CFF]/50 hover:shadow-[0_0_30px_rgba(123,92,255,0.28)]',
  secondary:
    'text-white border border-white/12 bg-white/5 hover:bg-white/8 hover:border-white/20',
  neon:
    'text-white border border-[#7B5CFF]/45 bg-[#7B5CFF]/14 shadow-[0_0_36px_rgba(123,92,255,0.24)] hover:bg-[#7B5CFF]/18',
  success:
    'text-white border border-[#21F1A8]/35 bg-[#21F1A8]/10 shadow-[0_0_32px_rgba(33,241,168,0.18)] hover:bg-[#21F1A8]/15',
  ghost:
    'text-white hover:bg-white/6',
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
