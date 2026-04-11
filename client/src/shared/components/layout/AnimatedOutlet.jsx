import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

const MotionDiv = motion.div;

const ease = [0.22, 1, 0.36, 1];

export default function AnimatedOutlet() {
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  const variants = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
      };

  const duration = reducedMotion ? 0.12 : 0.26;

  return (
    <AnimatePresence mode="wait">
      <MotionDiv
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration, ease }}
        className="min-h-0"
      >
        <Outlet />
      </MotionDiv>
    </AnimatePresence>
  );
}
