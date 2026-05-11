import { cn } from '@/shared/lib/cn';

export default function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-border bg-surface p-6 backdrop-blur-xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
