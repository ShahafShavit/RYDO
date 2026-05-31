import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import IconButton from '@/shared/components/bold/IconButton';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { formatChatPreviewTime } from '@/features/club-chat/utils/formatChatTime';
import { cn } from '@/shared/lib/cn';
import BoldScrollArea from '@/shared/components/bold/BoldScrollArea';

function UnreadBadge({ count }) {
  if (!count || count < 1) return null;
  return (
    <span className="rydo-unread-pip rydo-unread-pip-inline" aria-hidden>
      {count > 99 ? '99+' : count}
    </span>
  );
}

function ConversationRow({ row, onSelect }) {
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

export default function ClubChatListBold({
  summary,
  isLoading,
  onSelectClub,
  onClose,
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return summary;
    return summary.filter((r) => (r.clubName || '').toLowerCase().includes(q));
  }, [summary, query]);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden pt-[var(--rydo-bold-page-top)]"
      dir="ltr"
    >
      <header className="shrink-0 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Eyebrow>Community</Eyebrow>
            <DisplayTitle size="lg" className="mt-1.5">
              Club chat
            </DisplayTitle>
          </div>
          {onClose ? (
            <IconButton
              icon={X}
              size="lg"
              className="mt-1 shrink-0"
              aria-label="Close club chat"
              onClick={onClose}
            />
          ) : null}
        </div>
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

      <BoldScrollArea className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pb-[max(1rem,var(--rydo-safe-bottom))] pt-1">
        {isLoading ? (
          <p className="rydo-subtle px-3 py-4 text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="rydo-subtle px-3 py-4 text-sm">
            {query.trim() ? 'No conversations match your search.' : 'Join a club to use chat.'}
          </p>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((row) => (
              <li key={row.clubId}>
                <ConversationRow row={row} onSelect={onSelectClub} />
              </li>
            ))}
          </ul>
        )}
      </BoldScrollArea>
    </div>
  );
}
