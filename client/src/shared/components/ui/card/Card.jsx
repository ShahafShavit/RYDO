import { cn } from '@/shared/lib/cn';

export default function Card({ children, className }) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-white/5 bg-white/5 p-6 backdrop-blur-xl',
        className
      )}
    >
      {children}
    </div>
  );
}
