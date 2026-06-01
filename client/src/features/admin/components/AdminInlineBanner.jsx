import { cn } from '@/shared/lib/cn';

export default function AdminInlineBanner({ tone = 'success', message, onDismiss = null }) {
  if (!message) return null;

  const tones = {
    success: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100',
    error: 'border-red-500/40 bg-red-500/10 text-red-200',
  };

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm',
        tones[tone] || tones.success,
      )}
      role="status"
    >
      <span>{message}</span>
      {onDismiss ? (
        <button type="button" className="shrink-0 text-fg-muted hover:text-fg" onClick={onDismiss}>
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
