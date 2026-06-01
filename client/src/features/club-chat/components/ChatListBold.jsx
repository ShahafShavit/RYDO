import { useMemo, useState } from 'react';
import { Bike, Search } from 'lucide-react';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { formatChatPreviewTime } from '@/features/club-chat/utils/formatChatTime';
import { formatRideChatTitle } from '@/features/ride-chat/utils/formatRideChatTitle';
import { cn } from '@/shared/lib/cn';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import BoldScrollArea from '@/shared/components/bold/BoldScrollArea';

function UnreadBadge({ count }) {
  if (!count || count < 1) return null;
  return (
    <span className="rydo-unread-pip rydo-unread-pip-inline" aria-hidden>
      {count > 99 ? '99+' : count}
    </span>
  );
}

function ClubConversationRow({ row, onSelect }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-black/20"
      onClick={() => onSelect(row)}
    >
      <UserAvatar
        avatarUrl={row.clubAvatarUrl}
        displayName={row.clubName || 'Club'}
        sizeClass="h-12 w-12"
        textClass="text-base"
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-fg">
            {row.clubName}
          </span>
          {row.lastMessageAt ? (
            <span className="rydo-tnum shrink-0 text-[11px] text-fg-subtle">
              {formatChatPreviewTime(row.lastMessageAt)}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p
            className={cn(
              'min-w-0 flex-1 truncate text-[12.5px] leading-snug',
              row.lastMessagePreview ? 'text-fg-subtle' : 'italic text-fg-subtle',
            )}
          >
            {row.lastMessagePreview || 'No messages yet'}
          </p>
          <UnreadBadge count={row.unreadCount} />
        </div>
      </div>
    </button>
  );
}

function RideConversationRow({ row, onSelect }) {
  const title = formatRideChatTitle(row.rideName, row.clubName);
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-black/20"
      onClick={() => onSelect(row)}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-rydo-purple/35 bg-rydo-purple/15 text-rydo-purple">
        <Bike className="h-5 w-5" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-fg">{title}</span>
          {row.lastMessageAt ? (
            <span className="rydo-tnum shrink-0 text-[11px] text-fg-subtle">
              {formatChatPreviewTime(row.lastMessageAt)}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p
            className={cn(
              'min-w-0 flex-1 truncate text-[12.5px] leading-snug',
              row.lastMessagePreview ? 'text-fg-subtle' : 'italic text-fg-subtle',
            )}
          >
            {row.lastMessagePreview || 'No messages yet'}
            {row.readOnly ? (
              <span className="ml-1.5 text-[11px] text-amber-200/80">· Read-only</span>
            ) : null}
          </p>
          <UnreadBadge count={row.unreadCount} />
        </div>
      </div>
    </button>
  );
}

function activityMs(iso) {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** Inbox-style ordering: threads with messages first, then empty active rides, then read-only/archived. */
function conversationSortKey(row, kind) {
  const hasMessage = Boolean(row.lastMessageAt);
  const unread = Number(row.unreadCount) || 0;
  const readOnly = kind === 'ride' && Boolean(row.readOnly);

  if (hasMessage) {
    return {
      priority: 2,
      activity: activityMs(row.lastMessageAt),
      unread,
    };
  }
  if (readOnly) {
    return {
      priority: 0,
      activity: activityMs(row.scheduledDate),
      unread: 0,
    };
  }
  return {
    priority: 1,
    activity: activityMs(row.scheduledDate),
    unread: 0,
  };
}

export default function ChatListBold({
  clubSummary,
  rideSummary,
  isLoading,
  onSelectClub,
  onSelectRide,
  insetTabBar = false,
}) {
  const [query, setQuery] = useState('');

  const merged = useMemo(() => {
    const clubs = (clubSummary || []).map((row) => {
      const sort = conversationSortKey(row, 'club');
      return {
        kind: 'club',
        key: `club-${row.clubId}`,
        sortName: (row.clubName || '').toLowerCase(),
        row,
        ...sort,
      };
    });
    const rides = (rideSummary || []).map((row) => {
      const sort = conversationSortKey(row, 'ride');
      return {
        kind: 'ride',
        key: `ride-${row.rideId}`,
        sortName: formatRideChatTitle(row.rideName, row.clubName).toLowerCase(),
        row,
        ...sort,
      };
    });
    return [...clubs, ...rides].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.priority === 2 && b.unread !== a.unread) return b.unread - a.unread;
      if (b.activity !== a.activity) return b.activity - a.activity;
      if (a.sortName !== b.sortName) return a.sortName.localeCompare(b.sortName);
      return a.key.localeCompare(b.key);
    });
  }, [clubSummary, rideSummary]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((item) => {
      if (item.kind === 'club') {
        return (item.row.clubName || '').toLowerCase().includes(q);
      }
      return item.sortName.includes(q);
    });
  }, [merged, query]);

  return (
    <BoldScreen className="overflow-hidden" dir="ltr">
      <header className="shrink-0 px-5 pt-[var(--rydo-bold-page-top)]">
        <DisplayTitle size="lg">Chat</DisplayTitle>
      </header>

      <div className="shrink-0 px-4 pb-1 pt-4">
        <div className="flex h-[46px] items-center gap-2.5 rounded-full border border-border bg-black/25 px-4">
          <Search className="h-[17px] w-[17px] shrink-0 text-fg-subtle" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
            autoComplete="off"
            aria-label="Search conversations"
          />
        </div>
      </div>

      <BoldScrollArea
        insetTabBar={insetTabBar}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pt-1"
      >
        {isLoading ? (
          <p className="rydo-subtle px-3 py-4 text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="rydo-subtle px-3 py-4 text-sm">
            {query.trim()
              ? 'No conversations match your search.'
              : 'No conversations yet.'}
          </p>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((item) => (
              <li key={item.key}>
                {item.kind === 'club' ? (
                  <ClubConversationRow row={item.row} onSelect={onSelectClub} />
                ) : (
                  <RideConversationRow row={item.row} onSelect={onSelectRide} />
                )}
              </li>
            ))}
          </ul>
        )}
      </BoldScrollArea>
    </BoldScreen>
  );
}
