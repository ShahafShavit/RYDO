import { cn } from '@/shared/lib/cn';
import { EXPLORE_SCOPE_TABS } from '@/features/routes/explore/explore-scope';

export default function ExploreScopeTabs({ scope, onScopeChange, className }) {
  return (
    <div className={cn('flex gap-2', className)}>
      {EXPLORE_SCOPE_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={cn('rydo-chip flex-1 justify-center', scope === tab.key && 'rydo-chip-on')}
          onClick={() => onScopeChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
