import { ThumbsUp } from 'lucide-react';
import AnimatedHazardScore from '@/features/hazards/components/AnimatedHazardScore';
import { cn } from '@/shared/lib/cn';

export default function HazardScoreBadge({ score, className, compact = false, variant = 'default' }) {
  if (score == null) return null;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full font-semibold tabular-nums text-amber-100',
        variant === 'map' ? 'bg-black/75' : 'bg-amber-500/15',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        className,
      )}
      title={`Community score: ${score}`}
      aria-label={`Community score ${score}`}
    >
      <ThumbsUp
        className={cn('shrink-0 text-amber-300', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')}
        strokeWidth={2.5}
        aria-hidden
      />
      <AnimatedHazardScore score={score} />
    </span>
  );
}
