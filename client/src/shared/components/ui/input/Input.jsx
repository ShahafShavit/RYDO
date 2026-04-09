import { forwardRef } from 'react';
import { cn } from '@/shared/lib/cn';

const Input = forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none backdrop-blur-xl placeholder:text-white/35 transition focus:border-[#7B5CFF]/60 focus:shadow-[0_0_0_4px_rgba(123,92,255,0.12)]',
        className
      )}
      {...props}
    />
  );
});

export default Input;
