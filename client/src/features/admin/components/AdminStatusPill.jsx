import { cn } from '@/shared/lib/cn';

const TONES = {
  admin: 'border-violet-400/50 bg-violet-500/15 text-violet-100',
  user: 'border-border bg-surface text-fg-muted',
  active: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100',
  inactive: 'border-border bg-surface-strong text-fg-subtle',
  published: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100',
  flagged: 'border-amber-400/50 bg-amber-500/10 text-amber-100',
  draft: 'border-border bg-surface text-fg-muted',
  resolved: 'border-border bg-surface-strong text-fg-subtle',
  low: 'border-border bg-surface text-fg-muted',
  medium: 'border-amber-400/50 bg-amber-500/10 text-amber-100',
  high: 'border-red-400/50 bg-red-500/10 text-red-200',
  critical: 'border-red-500/60 bg-red-500/20 text-red-100',
  neutral: 'border-border bg-surface text-fg-muted',
  featured: 'border-amber-400/50 bg-amber-500/10 text-amber-100',
  system: 'border-border bg-surface-strong text-fg-subtle',
  custom: 'border-violet-400/50 bg-violet-500/15 text-violet-100',
};

export default function AdminStatusPill({ label, tone = 'neutral', className }) {
  const key = String(label || tone).toLowerCase();
  const toneClass = TONES[key] || TONES[tone] || 'border-border bg-surface text-fg-muted';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        toneClass,
        className,
      )}
    >
      {label}
    </span>
  );
}
