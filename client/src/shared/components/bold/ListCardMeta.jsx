import { cn } from '@/shared/lib/cn';

const ACCENT = {
  green: 'text-[var(--rydo-green-bright)]',
  amber: 'text-[var(--rydo-amber)]',
  accent: 'text-[var(--rydo-purple)]',
};

/**
 * Stacked meta lines for list cards (rides, routes) — one label per row.
 * @param {{ text: string, accent?: keyof typeof ACCENT }[]} parts
 */
export default function ListCardMeta({ parts, className }) {
  const filtered = parts.filter((p) => p?.text);
  if (!filtered.length) return null;

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-subtle',
        className,
      )}
    >
      {filtered.map((part, i) => (
        <span
          key={`${part.text}-${i}`}
          className={cn('truncate leading-snug', part.accent ? ACCENT[part.accent] : undefined)}
        >
          {part.text}
        </span>
      ))}
    </div>
  );
}

export function difficultyAccent(difficulty) {
  const d = String(difficulty || '').toLowerCase();
  if (d === 'hard') return 'amber';
  if (d === 'casual' || d === 'easy') return 'green';
  return undefined;
}
