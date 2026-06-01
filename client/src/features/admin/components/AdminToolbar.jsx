import { Search } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export function AdminFilterPills({ options, value, onChange, className }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value ?? 'all'}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              active ? 'bg-rydo-purple/20 text-fg' : 'bg-surface-strong text-fg-muted hover:text-fg',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AdminToolbar({
  search = '',
  onSearchChange = null,
  searchPlaceholder = 'Search…',
  filters = null,
  total = null,
  className,
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {onSearchChange ? (
          <label className="relative block min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-full border border-border bg-surface py-2 pl-9 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple/50"
            />
          </label>
        ) : null}
        {filters}
      </div>
      {total != null ? (
        <p className="shrink-0 text-xs text-fg-subtle">
          {total} result{total === 1 ? '' : 's'}
        </p>
      ) : null}
    </div>
  );
}
