import { cn } from '@/shared/lib/cn';

export default function Eyebrow({ children, className, ...props }) {
  return (
    <span className={cn('rydo-eyebrow', className)} {...props}>
      {children}
    </span>
  );
}
