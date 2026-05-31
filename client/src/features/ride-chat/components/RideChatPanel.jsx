import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, generatePath } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import { userProfilePath } from '@/shared/lib/user-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { rideEventWindow } from '@/features/rides/utils/rideEventWindow';
import { rideChatApi } from '@/features/ride-chat/api/ride-chat-api';
import { useRideChatUi } from '@/features/ride-chat/ride-chat-ui-context';
import { useRideChatHub } from '@/features/ride-chat/hooks/useRideChatHub';
import ClubChatMessageBubble from '@/features/club-chat/components/ClubChatMessageBubble';
import RideChatComposer from '@/features/ride-chat/components/RideChatComposer';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import IconButton from '@/shared/components/bold/IconButton';
import { isSameCalendarDay } from '@/features/club-chat/utils/formatChatTime';
import { cn } from '@/shared/lib/cn';

const MotionDiv = motion.div;

export default function RideChatPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { rideChatOpen: open, rideChatRideId: rideId, setRideChatOpen } = useRideChatUi();
  const messagesScrollRef = useRef(null);

  const { ride } = useRideEvent(rideId);
  const windowMeta = useMemo(() => rideEventWindow(ride), [ride]);
  const readOnly = !windowMeta.chatWritable;

  const messagesQuery = useQuery({
    queryKey: ['rideChat', 'messages', rideId],
    queryFn: async () => {
      const data = await rideChatApi.getMessages(rideId);
      if (Array.isArray(data)) return { messages: data, readOnly: false, closesAt: null };
      return {
        messages: Array.isArray(data?.messages) ? data.messages : [],
        readOnly: Boolean(data?.readOnly),
        closesAt: data?.closesAt ?? null,
      };
    },
    enabled: Boolean(open && rideId && user?.id),
    staleTime: 10_000,
  });

  const messages = messagesQuery.data?.messages ?? [];
  const chatReadOnly = messagesQuery.data?.readOnly ?? readOnly;

  useRideChatHub(rideId, open && Boolean(rideId));

  const sendMutation = useMutation({
    mutationFn: (payload) => rideChatApi.postMessage(rideId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rideChat', 'messages', rideId] });
    },
  });

  useEffect(() => {
    if (!messagesScrollRef.current || !messagesQuery.isSuccess || messages.length === 0) return;
    const el = messagesScrollRef.current;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [rideId, messagesQuery.isSuccess, messages.length]);

  useEffect(() => {
    if (!rideId || !open || !messagesQuery.isSuccess) return undefined;
    const t = window.setTimeout(() => {
      rideChatApi.postRead(rideId, { markLatest: true }).catch(() => {});
    }, 400);
    return () => window.clearTimeout(t);
  }, [rideId, open, messagesQuery.isSuccess, messages.length]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSend = useCallback(
    async (payload) => {
      if (!rideId) return;
      await sendMutation.mutateAsync(payload);
    },
    [rideId, sendMutation],
  );

  const showTodayPill = useMemo(() => {
    const today = new Date();
    return messages.some((m) => m.sentAt && isSameCalendarDay(new Date(m.sentAt), today));
  }, [messages]);

  const ridePagePath =
    rideId != null ? generatePath(ROUTES.rideEvent, { rideId: String(rideId) }) : null;

  if (!user?.id) return null;

  return (
    <>
      <AnimatePresence>
        {open ? (
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'fixed z-(--rydo-z-chat-panel) flex flex-col overflow-hidden',
              'inset-0 border-0 bg-[var(--rydo-bg-deep)] font-[Inter,sans-serif] text-fg',
              'md:inset-auto md:bottom-24 md:right-8 md:h-[min(560px,calc(100vh-8rem))] md:w-[400px]',
              'md:rounded-2xl md:border md:border-border md:shadow-2xl',
            )}
            dir="ltr"
          >
            <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-3.5 pb-3 pt-[var(--rydo-bold-page-top)] sm:px-4">
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-rydo-purple/20 text-rydo-purple">
                <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                {ridePagePath ? (
                  <Link
                    to={ridePagePath}
                    onClick={() => setRideChatOpen(false)}
                    className="block min-w-0 no-underline outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-rydo-purple"
                  >
                    <DisplayTitle as="div" size="sm" className="truncate text-base leading-tight">
                      {ride?.name || 'Ride chat'}
                    </DisplayTitle>
                  </Link>
                ) : (
                  <DisplayTitle as="div" size="sm" className="truncate text-base leading-tight">
                    {ride?.name || 'Ride chat'}
                  </DisplayTitle>
                )}
                <div className="mt-0.5 text-[11px] text-fg-subtle">
                  {chatReadOnly ? 'Read-only — chat closed' : 'Group coordination'}
                </div>
              </div>
              <IconButton icon={X} aria-label="Close chat" onClick={() => setRideChatOpen(false)} />
            </header>

            {chatReadOnly ? (
              <div className="shrink-0 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100/90">
                Messages are archived. Chat closed 48 hours after the scheduled start.
              </div>
            ) : null}

            <div
              ref={messagesScrollRef}
              className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3.5 py-3.5"
            >
              {messagesQuery.isLoading ? (
                <p className="rydo-subtle text-sm">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="rydo-subtle px-1 text-center text-sm">
                  Coordinate with your group — messages archive 48h after start.
                </p>
              ) : (
                <>
                  {showTodayPill ? (
                    <div className="flex justify-center">
                      <span className="rydo-eyebrow rounded-full border border-border bg-black/30 px-3 py-0.5 text-[9.5px]">
                        Today
                      </span>
                    </div>
                  ) : null}
                  {messages.map((m) => {
                    const isMine = Number(m.authorUserId) === Number(user.id);
                    const profileTo =
                      !isMine && m.authorHandle
                        ? userProfilePath(m.authorHandle)
                        : null;
                    return (
                      <ClubChatMessageBubble
                        key={m.id}
                        message={m}
                        isMine={isMine}
                        profileTo={profileTo}
                        onProfileClick={() => setRideChatOpen(false)}
                      />
                    );
                  })}
                </>
              )}
            </div>

            <RideChatComposer
              disabled={chatReadOnly}
              isPending={sendMutation.isPending}
              onSend={handleSend}
            />
          </MotionDiv>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** FAB to open ride chat — used on ride event and live map pages. */
export function RideChatFab({ rideId, className, style }) {
  const { openRideChat } = useRideChatUi();

  if (!rideId) return null;

  return (
    <button
      type="button"
      aria-label="Open ride chat"
      onClick={() => openRideChat(rideId)}
      style={style}
      className={cn(
        'flex h-13 w-13 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-rydo-purple text-white shadow-lg shadow-rydo-purple/30 transition-[transform,box-shadow] duration-200 ease-out hover:scale-105 active:scale-95',
        className,
      )}
    >
      <MessageCircle className="h-5 w-5" aria-hidden />
    </button>
  );
}
