import { Search } from 'lucide-react';
import Input from '@/shared/components/ui/input/Input';
import { EXPLORE_SEARCH_PLACEHOLDERS } from '@/features/routes/explore/explore-scope';
import { cn } from '@/shared/lib/cn';

export function ExploreSearchBarDesktop({ scope, value, onChange, className }) {
  return (
    <div className={cn('relative min-w-0 flex-1', className)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4">
        <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
      </div>
      <Input
        type="search"
        placeholder={EXPLORE_SEARCH_PLACEHOLDERS[scope] ?? EXPLORE_SEARCH_PLACEHOLDERS.all}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="relative z-0 pl-11"
        aria-label={EXPLORE_SEARCH_PLACEHOLDERS[scope] ?? EXPLORE_SEARCH_PLACEHOLDERS.all}
      />
    </div>
  );
}

export function ExploreSearchBarMobile({ scope, value, onChange, className }) {
  return (
    <div
      className={cn(
        'flex h-12 items-center gap-2.5 rounded-full border border-border bg-black/25 px-4',
        className,
      )}
    >
      <Search className="h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={EXPLORE_SEARCH_PLACEHOLDERS[scope] ?? EXPLORE_SEARCH_PLACEHOLDERS.all}
        className="min-w-0 flex-1 border-0 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
        aria-label={EXPLORE_SEARCH_PLACEHOLDERS[scope] ?? EXPLORE_SEARCH_PLACEHOLDERS.all}
      />
    </div>
  );
}
