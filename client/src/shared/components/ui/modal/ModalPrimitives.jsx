import { ChevronLeft, X } from 'lucide-react';
import { useBoldMobile } from '@/shared/hooks/useBoldMobile';
import { cn } from '@/shared/lib/cn';

/** Matches `FormField` label styling — use for any standalone label in modals. */
export const modalFieldLabelClass = 'text-sm font-medium text-fg/76';

/**
 * Native controls in modals — aligned with shared `Input` (focus ring, surface bg).
 * Use for `input` (except `file`), `textarea`, and `select`.
 */
/** Flat surface on glass panel — shell carries blur (see `.rydo-modal-panel` in index.css). */
export const modalControlClass =
  'w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-fg outline-none placeholder:text-fg-subtle transition focus:border-rydo-purple/60 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--rydo-purple)_20%,transparent)]';

/** In-modal section titles (e.g. Details, Invites, upload groups). */
export const modalSectionTitleClass = 'text-sm font-semibold text-fg';

/** KPI / summary tile labels (upload stats, etc.). */
export const modalMetricLabelClass = 'text-xs font-medium uppercase tracking-widest text-fg-subtle';

/** Helper lines under fields or in headers. */
export const modalHintClass = 'text-sm leading-snug text-fg-muted';

/** Tighter secondary lines (tile footnotes, meta). */
export const modalFinePrintClass = 'text-xs leading-snug text-fg-subtle';

/** Shared visual shell for portal modals — uses theme `rydo-glass` tokens (see index.css `.rydo-glass`). */
export function ModalPanel({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'rydo-modal-panel rydo-glass flex w-full flex-col rounded-[28px] p-6 text-sm text-fg antialiased',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ModalCloseButton({ className, type = 'button', ...props }) {
  const isMobile = useBoldMobile();

  return (
    <button
      type={type}
      className={cn(
        'shrink-0 rounded-lg p-2 text-fg-muted transition hover:bg-surface-strong hover:text-fg disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      aria-label={isMobile ? 'Back' : 'Close'}
      {...props}
    >
      {isMobile ? <ChevronLeft className="h-6 w-6" aria-hidden /> : <X className="h-5 w-5" aria-hidden />}
    </button>
  );
}

/**
 * @param {object} props
 * @param {React.ReactNode} [props.title]
 * @param {string} [props.titleId]
 * @param {React.ReactNode} [props.description]
 * @param {() => void} [props.onClose]
 * @param {boolean} [props.divider] — bottom border under header row
 * @param {boolean} [props.closeDisabled]
 * @param {string} [props.className]
 * @param {React.ReactNode} [props.children] — extra content in title column (below title/description)
 */
export function ModalHeader({
  title,
  titleId,
  description,
  onClose,
  divider = false,
  closeDisabled = false,
  className,
  children,
}) {
  const isMobile = useBoldMobile();

  const titleBlock = (
    <div className="min-w-0 flex-1">
      {title != null ? (
        typeof title === 'string' ? (
          <h2 id={titleId} className="text-xl font-semibold leading-snug tracking-tight text-fg">
            {title}
          </h2>
        ) : (
          title
        )
      ) : null}
      {description ? <p className={cn('mt-1.5', modalHintClass)}>{description}</p> : null}
      {children}
    </div>
  );

  return (
    <div
      className={cn(
        'rydo-modal-header flex items-start justify-between gap-4',
        isMobile && onClose && 'items-center gap-3',
        divider && 'border-b border-border pb-4 max-md:border-b-0',
        className,
      )}
    >
      {isMobile && onClose ? (
        <>
          <ModalCloseButton onClick={onClose} disabled={closeDisabled} />
          {titleBlock}
        </>
      ) : (
        <>
          {titleBlock}
          {onClose ? <ModalCloseButton onClick={onClose} disabled={closeDisabled} /> : null}
        </>
      )}
    </div>
  );
}
