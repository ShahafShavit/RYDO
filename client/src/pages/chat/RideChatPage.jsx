import ChatThread from '@/features/chat/components/ChatThread';
import ChatInput from '@/features/chat/components/ChatInput';

export default function RideChatPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Communication</p>
        <h1 className="mt-2 text-3xl font-semibold">Ride chat</h1>
      </div>
      <ChatThread />
      <ChatInput />
    </section>
  );
}
