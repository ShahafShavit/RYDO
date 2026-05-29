import { AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export default function HazardStrip({ text, className }) {
  if (!text) return null;
  return (
    <div className={cn('rydo-hazard-strip', className)}>
      <span className="shrink-0 text-[var(--rydo-amber)]">
        <AlertTriangle className="h-[15px] w-[15px]" strokeWidth={2} aria-hidden />
      </span>
      <span className="rydo-subtle text-[12.5px] leading-snug">{text}</span>
    </div>
  );
}
