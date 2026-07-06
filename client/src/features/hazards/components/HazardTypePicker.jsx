import { HAZARD_TYPES, hazardTypeIcon } from '@/features/hazards/hazard-constants';
import { hazardTransition } from '@/features/hazards/utils/hazard-motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { cn } from '@/shared/lib/cn';
import { motion } from 'framer-motion';

const MotionButton = motion.button;

export default function HazardTypePicker({ value, onChange, disabled = false }) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Hazard type">
      {HAZARD_TYPES.map((item) => {
        const selected = value === item.id;
        return (
          <MotionButton
            key={item.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(item.id)}
            animate={{
              scale: selected ? 1.02 : 1,
              opacity: disabled ? 0.5 : 1,
            }}
            transition={hazardTransition(reducedMotion, { duration: 0.2 })}
            className={cn(
              'relative flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-center transition-colors duration-200',
              selected
                ? 'border-amber-400/70 bg-amber-500/15 text-fg ring-2 ring-amber-400/30'
                : 'border-border bg-surface text-fg-muted hover:border-border-strong',
              disabled && 'pointer-events-none',
            )}
          >
            {selected && !reducedMotion ? (
              <motion.span
                layoutId="hazard-type-selection"
                className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-amber-400/20"
                transition={hazardTransition(reducedMotion, { duration: 0.22 })}
              />
            ) : null}
            <span className="relative text-2xl leading-none" aria-hidden>
              {hazardTypeIcon(item.id)}
            </span>
            <span className="relative text-xs font-medium leading-tight">{item.label}</span>
          </MotionButton>
        );
      })}
    </div>
  );
}
