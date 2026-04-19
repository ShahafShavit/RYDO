import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { cn } from '@/shared/lib/cn';

const MotionDiv = motion.div;

const easeOut = [0.32, 0.72, 0, 1];

/**
 * Portal modal: one fade on the shell, motion on the panel via transform only (no nested opacity multiply).
 * Scrim uses `.rydo-modal-scrim` (dim + blur) — see `index.css`.
 * `contentClassName` merges onto the fixed overlay (centering + padding), not the inner panel.
 */
export default function AnimatedModal({
  open,
  onClose,
  children,
  zIndexClass = 'z-(--rydo-z-modal)',
  contentClassName = '',
  panelClassName = '',
  maxWidthClassName = 'max-w-xl',
}) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const shellDur = reducedMotion ? 0.1 : 0.13;
  const panelDur = reducedMotion ? 0.1 : 0.16;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <MotionDiv
          key="animated-modal"
          className={cn('fixed inset-0 flex items-center justify-center p-4 sm:p-6', zIndexClass, contentClassName)}
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shellDur, ease: easeOut }}
        >
          <div
            className="rydo-modal-scrim"
            aria-hidden
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          />
          <MotionDiv
            className={cn('relative z-10 w-full', maxWidthClassName, panelClassName)}
            initial={
              reducedMotion
                ? { y: 0, scale: 1 }
                : { y: 14, scale: 0.985 }
            }
            animate={{ y: 0, scale: 1 }}
            exit={reducedMotion ? { y: 0, scale: 1 } : { y: 8, scale: 0.99 }}
            transition={{ duration: panelDur, ease: easeOut }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {children}
          </MotionDiv>
        </MotionDiv>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
