import { cn } from '@/shared/lib/cn';

export default function Badge({ children, className, variant = 'default' }) {
  const styles = {
    default: 'border-white/12 bg-white/6 text-white',
    neon: 'border-[#7B5CFF]/40 bg-[#7B5CFF]/10 text-white shadow-[0_0_18px_rgba(123,92,255,0.16)]',
    success: 'border-[#21F1A8]/35 bg-[#21F1A8]/10 text-white shadow-[0_0_18px_rgba(33,241,168,0.14)]',
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
