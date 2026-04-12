import { forwardRef } from 'react';
import { cn } from '@/shared/lib/cn';

const Input = forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-fg outline-none backdrop-blur-xl placeholder:text-fg-subtle transition focus:border-rydo-purple/60 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--rydo-purple)_20%,transparent)]',
        className
      )}
      {...props}
    />
  );
});

export default Input;
