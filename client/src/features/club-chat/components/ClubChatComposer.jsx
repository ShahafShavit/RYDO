import { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clubChatApi } from '@/features/club-chat/api/club-chat-api';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { Map, Calendar } from 'lucide-react';

function flatMentionables(data) {
  if (!data) return [];
  const u = (data.users || []).map((x) => ({ ...x, kind: x.kind || 'user' }));
  const r = (data.routes || []).map((x) => ({ ...x, kind: x.kind || 'route' }));
  const ri = (data.rides || []).map((x) => ({ ...x, kind: x.kind || 'ride' }));
  return [...u, ...r, ...ri];
}

export default function ClubChatComposer({ clubId, disabled, onSend }) {
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState([]);
  const [picker, setPicker] = useState(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const taRef = useRef(null);
  const listRef = useRef(null);

  const q = picker?.query ?? '';
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
    setHighlightIndex(0);
  }, [q, clubId]);

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

  return (
    <form onSubmit={handleSubmit} className="relative border-t border-border p-3 bg-black/20">
      {picker && choices.length > 0 ? (
        <ul
          ref={listRef}
          id={listboxId}
          className="absolute bottom-full left-3 right-3 mb-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-[var(--rydo-bg-deep)] shadow-xl z-10"
          role="listbox"
          aria-label="Mentions"
        >
          {choices.map((item, i) => (
            <li key={`${item.kind}-${item.id}`} data-mention-index={i}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlightIndex}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-white/10 ${
                  i === highlightIndex ? 'bg-white/12 ring-1 ring-inset ring-rydo-purple/40' : ''
                }`}
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
      <label className="sr-only" htmlFor="club-chat-input">
        Message
      </label>
      <div className="flex items-stretch gap-2">
        <textarea
          id="club-chat-input"
          ref={taRef}
          rows={3}
          value={text}
          onChange={handleChange}
          onKeyDown={handleComposerKeyDown}
          disabled={disabled}
          placeholder="Message the club… @ to mention"
          autoComplete="off"
          aria-autocomplete={mentionListOpen ? 'list' : undefined}
          aria-controls={mentionListOpen ? listboxId : undefined}
          aria-expanded={mentionListOpen}
          className="min-h-0 min-w-0 flex-1 resize-none rounded-xl border border-border bg-black/30 px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-rydo-purple/40"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="flex shrink-0 items-center justify-center rounded-xl bg-rydo-purple px-4 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </form>
  );
}
