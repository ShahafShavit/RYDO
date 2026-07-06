import { hazardTypeIcon } from '@/features/hazards/hazard-constants';
import HazardScoreBadge from '@/features/hazards/components/HazardScoreBadge';
import {
  hazardMarkerVariants,
  hazardTransition,
  HAZARD_DURATION,
} from '@/features/hazards/utils/hazard-motion';
import { cn } from '@/shared/lib/cn';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { motion } from 'framer-motion';

const MotionButton = motion.button;

export default function LiveHazardMarker({
  hazard,
  selected,
  isNew = false,
  isExiting = false,
  onClick,
  onExitComplete,
  offsetPx = { x: 0, y: 0 },
  clusterSize = 1,
}) {
  const reducedMotion = useReducedMotion();
  const icon = hazardTypeIcon(hazard.type);
  const clusterTitle = clusterSize > 1 ? `${clusterSize} hazards here` : undefined;

  return (
    <MotionButton
      type="button"
      onClick={onClick}
      title={clusterTitle}
      initial={isExiting ? false : 'hidden'}
      animate={isExiting ? 'exit' : 'visible'}
      variants={hazardMarkerVariants}
      transition={hazardTransition(reducedMotion, { duration: HAZARD_DURATION.marker })}
      onAnimationComplete={() => {
        if (isExiting) {
          onExitComplete?.(hazard.id);
        }
      }}
      style={{ x: offsetPx.x, y: offsetPx.y }}
      className={cn(
        'flex flex-col items-center border-0 bg-transparent p-0',
        selected ? 'z-30' : 'z-10',
      )}
      aria-label={`Hazard: ${hazard.type}, score ${hazard.score}`}
    >
      <motion.span
        animate={{
          scale: selected ? 1.1 : 1,
        }}
        transition={hazardTransition(reducedMotion, { duration: 0.2 })}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-full border-2 text-base shadow-lg',
          selected
            ? 'border-amber-300 bg-amber-500/90'
            : 'border-amber-500/60 bg-[color-mix(in_srgb,var(--rydo-bg-deep)_75%,#f59e0b)]',
          isNew && !reducedMotion && 'rydo-hazard-marker-pulse-ring',
        )}
      >
        {icon}
      </motion.span>
      <HazardScoreBadge score={hazard.score} compact variant="map" className="mt-0.5" />
    </MotionButton>
  );
}
