import { cn } from '@/shared/lib/cn';

export default function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none backdrop-blur-xl placeholder:text-white/35 transition focus:border-[#7B5CFF]/60 focus:shadow-[0_0_0_4px_rgba(123,92,255,0.12)]',
        className
      )}
      {...props}
    />
  );
}
