/** Shared motion tokens for hazard UI — mirrors app modal easing. */
export const HAZARD_EASE_OUT = [0.32, 0.72, 0, 1];

export const HAZARD_DURATION = {
  fast: 0.15,
  normal: 0.18,
  panel: 0.22,
  marker: 0.28,
  exit: 0.2,
};

export const HAZARD_PULSE_MS = 2000;
export const HAZARD_EXIT_MS = 200;

/**
 * @param {boolean} reducedMotion
 * @param {{ duration?: number, ease?: number[] }} [overrides]
 */
export function hazardTransition(reducedMotion, overrides = {}) {
  if (reducedMotion) {
    return { duration: 0 };
  }
  return {
    duration: overrides.duration ?? HAZARD_DURATION.normal,
    ease: overrides.ease ?? HAZARD_EASE_OUT,
    ...overrides,
  };
}

export const hazardPanelVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
};

export const hazardMarkerVariants = {
  hidden: { opacity: 0, scale: 0.6, y: -8 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.6, y: -8 },
};

export const hazardContentSwapVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export const hazardToastVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const hazardAccordionVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
};

export const hazardListStagger = {
  visible: {
    transition: { staggerChildren: 0.04 },
  },
};

export const hazardListItemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
};
