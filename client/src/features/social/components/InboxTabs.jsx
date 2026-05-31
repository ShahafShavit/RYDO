import { cn } from '@/shared/lib/cn';
import { INBOX_TABS } from '@/features/social/inbox-tabs';

/**
 * @param {{ activeTab: string, onTabChange: (id: string) => void, counts?: { friends?: number, rides?: number, club?: number, activity?: number } }} props
 */
export default function InboxTabs({ activeTab, onTabChange, counts = {} }) {
  return (
    <div className="rydo-inbox-tabs" role="tablist" aria-label="Inbox categories">
      {INBOX_TABS.map((t) => {
        const unread = counts[t.id] ?? 0;
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={unread > 0 ? `${t.label}, ${unread} unread` : t.label}
            className={cn('rydo-inbox-tab', isActive && 'rydo-inbox-tab-on')}
            onClick={() => onTabChange(t.id)}
          >
            <span className="rydo-inbox-tab-inner">
              <span className="rydo-inbox-tab-label">{t.label}</span>
              {unread > 0 ? (
                <span className="rydo-inbox-tab-badge" aria-hidden>
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}