import { AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Card from '@/shared/components/ui/card/Card';
import AnimatedHazardScore from '@/features/hazards/components/AnimatedHazardScore';
import HazardScoreBadge from '@/features/hazards/components/HazardScoreBadge';
import { hazardTypeIcon, hazardTypeLabel } from '@/features/hazards/hazard-constants';
import {
  hazardListItemVariants,
  hazardListStagger,
  hazardTransition,
} from '@/features/hazards/utils/hazard-motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { cn } from '@/shared/lib/cn';

const MotionLi = motion.li;
const MotionUl = motion.ul;
const MotionButton = motion.button;

function formatReportedAt(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(value);
  }
}

const SPLIT_SHELL = 'flex shrink-0 flex-col rounded-3xl border border-border bg-surface p-3 backdrop-blur-xl';

function HazardsHeader({ split, count, isLoading }) {
  if (split) {
    return (
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg">Route hazards</h3>
          <p className="text-[11px] text-fg-muted">Reported during live rides</p>
        </div>
        {!isLoading && count > 0 ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-100 transition-all duration-200"
            title={`${count} active hazard${count === 1 ? '' : 's'}`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--rydo-amber)]" strokeWidth={2} aria-hidden />
            <AnimatedHazardScore score={count} />
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <h3 className="text-lg font-semibold">Route hazards</h3>
      <p className="mt-1 text-sm text-fg-muted">
        Reported during live rides. Vote on hazards only while riding live nearby.
      </p>
    </>
  );
}

function HazardRow({ hazard, split, selected, onSelect, reducedMotion }) {
  const label = hazardTypeLabel(hazard.type);
  const icon = hazardTypeIcon(hazard.type);

  return (
    <MotionLi variants={hazardListItemVariants}>
      <MotionButton
        type="button"
        onClick={() => onSelect?.(hazard)}
        animate={{
          scale: selected ? 1.01 : 1,
        }}
        transition={hazardTransition(reducedMotion, { duration: 0.2 })}
        className={cn(
          'w-full rounded-2xl border text-left transition-colors duration-200',
          split ? 'px-2.5 py-2' : 'px-4 py-3',
          selected
            ? 'border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/40'
            : 'border-border bg-black/20 hover:bg-black/25 active:scale-[0.99]',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-base" aria-hidden>
              {icon}
            </span>
            <span className="min-w-0">
              <span className="font-medium text-fg">{label}</span>
              {hazard.description && split ? (
                <span className="mt-0.5 block truncate text-xs text-fg-muted">{hazard.description}</span>
              ) : null}
            </span>
          </span>
          <HazardScoreBadge score={hazard.score} compact={split} />
        </div>
        {hazard.description && !split ? (
          <p className="mt-1 text-sm text-fg-muted">{hazard.description}</p>
        ) : null}
        {!split ? (
          <p className="mt-2 text-xs text-fg-subtle">
            {formatReportedAt(hazard.reportedAt)}
            {hazard.reportedBy?.fullName ? ` · ${hazard.reportedBy.fullName}` : ''}
          </p>
        ) : null}
      </MotionButton>
    </MotionLi>
  );
}

/**
 * @param {{ hazards: object[], isLoading?: boolean, layout?: 'card' | 'split', selectedHazardId?: string | number | null, onSelectHazard?: (hazard: object) => void }} props
 */
export default function RouteHazardsPanel({
  hazards,
  isLoading,
  layout = 'card',
  selectedHazardId = null,
  onSelectHazard,
}) {
  const split = layout === 'split';
  const reducedMotion = useReducedMotion();

  if (isLoading) {
    const inner = (
      <>
        <HazardsHeader split={split} count={0} isLoading />
        <p className={cn('text-sm text-fg-muted', split ? 'mt-2' : 'mt-2')}>Loading hazards…</p>
      </>
    );
    if (split) {
      return <div className={SPLIT_SHELL}>{inner}</div>;
    }
    return <Card>{inner}</Card>;
  }

  const list =
    hazards.length === 0 ? (
      <AnimatePresence mode="wait">
        <motion.p
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={hazardTransition(reducedMotion)}
          className={cn('text-sm text-fg-muted', split ? 'mt-2' : 'mt-4')}
        >
          No active hazards on this route.
        </motion.p>
      </AnimatePresence>
    ) : (
      <MotionUl
        className={cn('space-y-2', split ? 'mt-2' : 'mt-4 space-y-3')}
        initial="hidden"
        animate="visible"
        variants={hazardListStagger}
      >
        {hazards.map((hazard) => (
          <HazardRow
            key={hazard.id}
            hazard={hazard}
            split={split}
            selected={hazard.id === selectedHazardId}
            onSelect={onSelectHazard}
            reducedMotion={reducedMotion}
          />
        ))}
      </MotionUl>
    );

  if (split) {
    return (
      <div className={SPLIT_SHELL} id="route-hazards">
        <HazardsHeader split count={hazards.length} isLoading={false} />
        {list}
      </div>
    );
  }

  return (
    <Card id="route-hazards">
      <HazardsHeader split={false} count={hazards.length} isLoading={false} />
      {list}
    </Card>
  );
}
