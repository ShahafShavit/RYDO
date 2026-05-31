import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

const POPOVER_MAX_W = 260;
const VIEWPORT_MARGIN = 12;

function prefersHover() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * @param {{
 *   content: import('react').ReactNode,
 *   topic?: string,
 *   id?: string,
 *   side?: 'top' | 'bottom',
 *   className?: string,
 *   iconClassName?: string,
 *   stopPropagation?: boolean,
 * }} props
 */
export default function InfoTooltip({
  content,
  topic = 'More info',
  id: idProp,
  side = 'bottom',
  className,
  iconClassName,
  stopPropagation = false,
}) {
  const autoId = useId();
  const popoverId = idProp ?? `info-tip-${autoId.replace(/:/g, '')}`;
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(null);
  const [hoverCapable] = useState(() => prefersHover());

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const maxW = Math.min(POPOVER_MAX_W, window.innerWidth - VIEWPORT_MARGIN * 2);
    let left = r.left + r.width / 2 - maxW / 2;
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - VIEWPORT_MARGIN - maxW));

    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const placeBottom =
      side === 'bottom' ? spaceBelow >= 80 || spaceBelow >= spaceAbove : spaceBelow > spaceAbove;

    const top = placeBottom ? r.bottom + 8 : r.top - 8;

    setStyle({
      top: placeBottom ? top : undefined,
      bottom: placeBottom ? undefined : window.innerHeight - top,
      left,
      width: maxW,
      transform: placeBottom ? undefined : 'translateY(-100%)',
    });
  }, [side]);

  const close = useCallback(() => setOpen(false), []);

  const openPopover = useCallback(() => {
    setOpen(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      const t = e.target;
      if (triggerRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      close();
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  const handleTriggerClick = (e) => {
    if (stopPropagation) e.stopPropagation();
    if (hoverCapable) return;
    setOpen((v) => !v);
  };

  const handleMouseEnter = () => {
    if (!hoverCapable) return;
    openPopover();
  };

  const handleMouseLeave = (e) => {
    if (!hoverCapable) return;
    const related = e.relatedTarget;
    if (related instanceof Node && popoverRef.current?.contains(related)) return;
    close();
  };

  const handleFocus = () => {
    if (hoverCapable) openPopover();
  };

  const handleBlur = (e) => {
    if (!hoverCapable) return;
    const related = e.relatedTarget;
    if (related instanceof Node && popoverRef.current?.contains(related)) return;
    close();
  };

  const popover =
    open && content && style
      ? createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="tooltip"
            className="fixed z-[9999] rounded-xl border border-border bg-[var(--rydo-bg-deep)] px-3 py-2.5 text-sm leading-snug text-fg shadow-lg shadow-black/40"
            style={style}
            onMouseEnter={hoverCapable ? openPopover : undefined}
            onMouseLeave={hoverCapable ? close : undefined}
          >
            {content}
          </div>,
          document.body,
        )
      : null;

  return (
    <span className={cn('inline-flex shrink-0 align-middle', className)}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-fg-subtle transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple/50',
          iconClassName,
        )}
        aria-label={`More info: ${topic}`}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={handleTriggerClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <CircleHelp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </button>
      {popover}
    </span>
  );
}
