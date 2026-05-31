import { cn } from '@/shared/lib/cn';
import { INBOX_TABS } from '@/features/social/inbox-tabs';

/**
 * @param {{ activeTab: string, onTabChange: (id: string) => void, counts?: { friends?: number, rides?: number, club?: number } }} props
 */
export default function InboxTabs({ activeTab, onTabChange, counts = {} }) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Inbox categories">
      {INBOX_TABS.map((t) => {
        const unread = counts[t.id] ?? 0;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={cn(
              'rounded-2xl px-4 py-2 text-sm font-semibold transition',
              activeTab === t.id
                ? 'bg-rydo-purple/22 text-fg shadow-[0_0_20px_color-mix(in_srgb,var(--rydo-purple)_20%,transparent)]'
                : 'bg-surface text-fg-muted hover:bg-surface-strong',
            )}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
            {unread > 0 ? (
              <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
