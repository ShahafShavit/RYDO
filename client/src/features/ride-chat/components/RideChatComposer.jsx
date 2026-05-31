import { useState } from 'react';
import { Send } from 'lucide-react';
import IconButton from '@/shared/components/bold/IconButton';
import { cn } from '@/shared/lib/cn';

export default function RideChatComposer({ disabled, onSend, isPending }) {
  const [text, setText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || disabled || isPending) return;
    await onSend({ body });
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex shrink-0 items-end gap-2 border-t border-border px-3.5 pt-3 pb-[calc(0.75rem+var(--rydo-safe-bottom))]">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled || isPending}
        placeholder={disabled ? 'Chat is read-only' : 'Message your group…'}
        rows={1}
        className={cn(
          'min-h-[44px] max-h-28 flex-1 resize-none rounded-2xl border border-border bg-black/25 px-3.5 py-2.5 text-sm text-fg',
          'placeholder:text-fg-subtle focus:border-rydo-purple/50 focus:outline-none focus:ring-1 focus:ring-rydo-purple/40',
          disabled && 'opacity-60',
        )}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <IconButton
        icon={Send}
        type="button"
        aria-label="Send message"
        disabled={disabled || isPending || !text.trim()}
        className="shrink-0 bg-rydo-purple text-[#0d0a1f] disabled:opacity-40"
        onClick={handleSubmit}
      />
    </form>
  );
}
