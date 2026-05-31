import { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { clubChatApi } from '@/features/club-chat/api/club-chat-api';
import UserAvatar from '@/shared/components/user/UserAvatar';
import IconButton from '@/shared/components/bold/IconButton';
import { Map, Calendar } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

function flatMentionables(data) {
  if (!data) return [];
  const u = (data.users || []).map((x) => ({ ...x, kind: x.kind || 'user' }));
  const r = (data.routes || []).map((x) => ({ ...x, kind: x.kind || 'route' }));
  const ri = (data.rides || []).map((x) => ({ ...x, kind: x.kind || 'ride' }));
  return [...u, ...r, ...ri];
}

function SendIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0d0a1f"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
    </svg>
  );
}

export default function ClubChatComposer({ clubId, disabled, onSend }) {
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState([]);
  const [picker, setPicker] = useState(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const taRef = useRef(null);
  const listRef = useRef(null);

  const q = picker?.query ?? '';
  const mentionResetKey = `${clubId}:${q}`;
  const [storedMentionResetKey, setStoredMentionResetKey] = useState(mentionResetKey);
  if (mentionResetKey !== storedMentionResetKey) {
    setStoredMentionResetKey(mentionResetKey);
    setHighlightIndex(0);
  }
  const { data: rawMentionables } = useQuery({
    queryKey: ['clubChat', 'mentionables', clubId, q],
    queryFn: () => clubChatApi.getMentionables(clubId, q),
    enabled: !!clubId && !!picker,
    staleTime: 20_000,
  });

  const choices = useMemo(() => flatMentionables(rawMentionables).slice(0, 24), [rawMentionables]);

  const mentionListOpen = !!(picker && choices.length > 0);
  const listboxId = 'club-chat-mention-listbox';

  useEffect(() => {
    if (!mentionListOpen || !listRef.current) return undefined;
    const row = listRef.current.querySelector(`[data-mention-index="${highlightIndex}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, mentionListOpen]);

  const handleChange = (e) => {
    const v = e.target.value;
    const cursor = e.target.selectionStart ?? v.length;
    setText(v);
    const before = v.slice(0, cursor);
    const at = before.lastIndexOf('@');
    if (at === -1) {
      setPicker(null);
      return;
    }
    const frag = before.slice(at + 1);
    if (frag.includes(' ') || frag.includes('\n')) {
      setPicker(null);
      return;
    }
    setPicker({ query: frag, at, cursor });
  };

  const pickItem = (item) => {
    if (!picker || !taRef.current) return;
    const { at, cursor } = picker;
    const before = text.slice(0, at);
    const after = text.slice(cursor);
    const label = item.label || String(item.id);
    const insert = `@${label} `;
    const next = before + insert + after;
    setText(next);
    setMentions((prev) => [...prev, { kind: item.kind, id: item.id, label }]);
    setPicker(null);
    const pos = before.length + insert.length;
    requestAnimationFrame(() => {
      taRef.current?.focus();
      taRef.current?.setSelectionRange(pos, pos);
    });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const body = text.trim();
    if (!body || disabled) return;
    await onSend({
      body,
      mentions: mentions.map((m) => ({ kind: m.kind, id: m.id })),
    });
    setText('');
    setMentions([]);
    setPicker(null);
  };

  const handleComposerKeyDown = (e) => {
    if (e.key === 'Escape' && picker) {
      e.preventDefault();
      setPicker(null);
      return;
    }

    if (mentionListOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % choices.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => (i - 1 + choices.length) % choices.length);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const item = choices[Math.min(highlightIndex, choices.length - 1)];
        if (item) pickItem(item);
        return;
      }
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const item = choices[Math.min(highlightIndex, choices.length - 1)];
        if (item) pickItem(item);
        return;
      }
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        setHighlightIndex((i) => (i - 1 + choices.length) % choices.length);
        return;
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e);
    }
  };

  useEffect(() => {
    if (!picker) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setPicker(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picker]);

  const canSend = !disabled && text.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-center gap-2 border-t border-border bg-black/25 px-3.5 pt-3 pb-[calc(0.75rem+var(--rydo-safe-bottom))]"
    >
      {picker && choices.length > 0 ? (
        <ul
          ref={listRef}
          id={listboxId}
          className="absolute bottom-full left-3.5 right-3.5 z-10 mb-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-[var(--rydo-bg-deep)] shadow-xl"
          role="listbox"
          aria-label="Mentions"
        >
          {choices.map((item, i) => (
            <li key={`${item.kind}-${item.id}`} data-mention-index={i}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlightIndex}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-white/10',
                  i === highlightIndex && 'bg-white/12 ring-1 ring-inset ring-rydo-purple/40',
                )}
                onMouseEnter={() => setHighlightIndex(i)}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  pickItem(item);
                }}
              >
                {item.kind === 'user' ? (
                  <UserAvatar
                    avatarUrl={item.avatarUrl}
                    displayName={item.label || `User ${item.id}`}
                    sizeClass="h-8 w-8"
                    textClass="text-[10px]"
                    className="shrink-0"
                  />
                ) : item.kind === 'route' ? (
                  <Map className="h-4 w-4 shrink-0 text-rydo-green" aria-hidden />
                ) : (
                  <Calendar className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                )}
                <span className="min-w-0 truncate">{item.label}</span>
                <span className="ml-auto text-[10px] uppercase text-fg-subtle">{item.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <IconButton
        icon={Plus}
        size="lg"
        className="!h-[42px] !w-[42px] shrink-0 opacity-50"
        aria-label="Attachments (coming soon)"
        disabled
      />

      <label className="sr-only" htmlFor="club-chat-input">
        Message the club
      </label>
      <div className="flex min-h-[44px] min-w-0 flex-1 items-center rounded-full border border-border bg-black/30 px-3.5">
        <textarea
          id="club-chat-input"
          ref={taRef}
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleComposerKeyDown}
          disabled={disabled}
          placeholder="Message the club… @ to mention"
          autoComplete="off"
          aria-autocomplete={mentionListOpen ? 'list' : undefined}
          aria-controls={mentionListOpen ? listboxId : undefined}
          aria-expanded={mentionListOpen}
          className="max-h-24 min-h-0 min-w-0 flex-1 resize-none border-0 bg-transparent py-2 text-[13.5px] leading-snug text-fg placeholder:text-fg-subtle outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send message"
        className={cn(
          'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 text-[#0d0a1f] transition-opacity',
          'bg-gradient-to-br from-rydo-green-bright to-rydo-purple shadow-[0_6px_22px_rgba(123,92,255,0.42)]',
          !canSend && 'cursor-not-allowed opacity-40',
        )}
      >
        <SendIcon />
      </button>
    </form>
  );
}
