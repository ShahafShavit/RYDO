import { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clubChatApi } from '@/features/club-chat/api/club-chat-api';
import { User, Map, Calendar } from 'lucide-react';

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
  const taRef = useRef(null);

  const q = picker?.query ?? '';
  const { data: rawMentionables } = useQuery({
    queryKey: ['clubChat', 'mentionables', clubId, q],
    queryFn: () => clubChatApi.getMentionables(clubId, q),
    enabled: !!clubId && !!picker,
    staleTime: 20_000,
  });

  const choices = useMemo(() => flatMentionables(rawMentionables).slice(0, 24), [rawMentionables]);

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
    e.preventDefault();
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
          className="absolute bottom-full left-3 right-3 mb-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-surface-strong shadow-xl z-10"
          role="listbox"
        >
          {choices.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-surface"
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  pickItem(item);
                }}
              >
                {item.kind === 'user' ? (
                  <User className="h-4 w-4 shrink-0 text-rydo-purple" aria-hidden />
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
      <textarea
        id="club-chat-input"
        ref={taRef}
        rows={3}
        value={text}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Message the club… Use @ to mention"
        className="w-full resize-none rounded-xl border border-border bg-black/30 px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-rydo-purple/40"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="rounded-xl bg-rydo-purple px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </form>
  );
}
