import { ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '@/shared/components/ui/button/Button';
import AnimatedHazardScore from '@/features/hazards/components/AnimatedHazardScore';
import { hazardTypeLabel } from '@/features/hazards/hazard-constants';
import {
  hazardContentSwapVariants,
  hazardPanelVariants,
  hazardTransition,
} from '@/features/hazards/utils/hazard-motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

const MotionDiv = motion.div;

function VoteActionBlock({ isOwnHazard, canVote, hazard, isPending, onVote }) {
  if (isOwnHazard) {
    return <p className="mt-3 text-xs text-fg-muted">You reported this hazard.</p>;
  }

  if (canVote) {
    return (
      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          variant={hazard.userVote === 1 ? 'neon' : 'secondary'}
          className="flex-1 transition-all duration-200 active:scale-95"
          disabled={isPending}
          onClick={() => onVote(hazard.userVote === 1 ? 0 : 1)}
        >
          <ThumbsUp className="mr-1 h-4 w-4" />
          Up
        </Button>
        <Button
          type="button"
          variant={hazard.userVote === -1 ? 'neon' : 'secondary'}
          className="flex-1 transition-all duration-200 active:scale-95"
          disabled={isPending}
          onClick={() => onVote(hazard.userVote === -1 ? 0 : -1)}
        >
          <ThumbsDown className="mr-1 h-4 w-4" />
          Down
        </Button>
      </div>
    );
  }

  return <p className="mt-3 text-xs text-fg-muted">Move within 200 m to vote.</p>;
}

export default function HazardVoteSheet({
  open,
  hazard,
  canVote,
  isOwnHazard,
  isPending,
  onVote,
  onClose,
}) {
  const reducedMotion = useReducedMotion();
  const actionKey = isOwnHazard ? 'own' : canVote ? 'vote' : 'far';

  return (
    <AnimatePresence>
      {open && hazard ? (
        <MotionDiv
          key="hazard-vote-sheet"
          data-hazard-vote-sheet
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={hazardPanelVariants}
          transition={hazardTransition(reducedMotion, { duration: 0.18 })}
          className="pointer-events-auto mx-auto w-[min(92vw,32rem)] shrink-0 rounded-2xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_94%,transparent)] p-3 shadow-xl backdrop-blur-xl"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold capitalize text-fg">{hazardTypeLabel(hazard.type)}</p>
              {hazard.description ? (
                <p className="mt-1 text-xs text-fg-muted line-clamp-2">{hazard.description}</p>
              ) : null}
              <p className="mt-1 text-xs text-fg-subtle">
                Score: <AnimatedHazardScore score={hazard.score} />
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1 text-fg-muted transition hover:bg-white/10 active:scale-95"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            <MotionDiv
              key={actionKey}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={hazardContentSwapVariants}
              transition={hazardTransition(reducedMotion, { duration: 0.15 })}
            >
              <VoteActionBlock
                isOwnHazard={isOwnHazard}
                canVote={canVote}
                hazard={hazard}
                isPending={isPending}
                onVote={onVote}
              />
            </MotionDiv>
          </AnimatePresence>
        </MotionDiv>
      ) : null}
    </AnimatePresence>
  );
}
