import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { hazardTransition } from '@/features/hazards/utils/hazard-motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { cn } from '@/shared/lib/cn';

const MotionSpan = motion.span;

/**
 * Score number with a brief pop when the value changes.
 */
export default function AnimatedHazardScore({ score, className }) {
  const reducedMotion = useReducedMotion();
  const prevScoreRef = useRef(score);
  const shouldPop = prevScoreRef.current !== score;

  useEffect(() => {
    prevScoreRef.current = score;
  }, [score]);

  if (score == null) return null;

  return (
    <MotionSpan
      key={score}
      initial={shouldPop && !reducedMotion ? { scale: 1.35, opacity: 0.7 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={hazardTransition(reducedMotion, { duration: 0.2 })}
      className={cn('inline-block tabular-nums', className)}
    >
      {score}
    </MotionSpan>
  );
}
