import { cn } from '@/shared/lib/cn';

const TAB_LABELS = {
  instances: 'Instances',
  templates: 'Templates',
  create: 'Create new',
};

export default function AdminChallengesTabs({ tab, onTabChange, className }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {Object.entries(TAB_LABELS).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onTabChange(key)}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
            tab === key ? 'bg-rydo-purple/20 text-fg' : 'bg-surface-strong text-fg-muted hover:text-fg',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
