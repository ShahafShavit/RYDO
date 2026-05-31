import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, generatePath, useMatch } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, Users, X } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import { userProfilePath } from '@/shared/lib/user-paths';
import { useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePreferences } from '@/features/account/hooks/useAccount';
import { env } from '@/shared/config/env';
import { clubChatApi } from '@/features/club-chat/api/club-chat-api';
import { useClubChatUi } from '@/features/club-chat/club-chat-ui-context';
import { useClubChatHub } from '@/features/club-chat/hooks/useClubChatHub';
import { inboxKeys } from '@/features/social/hooks/useInbox';
import { inboxSummaryKeys } from '@/features/social/hooks/useInboxSummary';
import ClubChatListBold from '@/features/club-chat/components/ClubChatListBold';
import ClubChatMessageBubble from '@/features/club-chat/components/ClubChatMessageBubble';
import ClubChatComposer from '@/features/club-chat/components/ClubChatComposer';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import IconButton from '@/shared/components/bold/IconButton';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { isSameCalendarDay } from '@/features/club-chat/utils/formatChatTime';
import { cn } from '@/shared/lib/cn';

const MotionDiv = motion.div;

export default function ClubChatDock() {
  const { user } = useAuth();
  const { data: preferences } = usePreferences();
  const queryClient = useQueryClient();
  const { chatOpen: open, setChatOpen, toggleChat } = useClubChatUi();
  const [clubId, setClubId] = useState(null);
  const messagesScrollRef = useRef(null);

  const liveRideMatch = useMatch({ path: ROUTES.rideLive, end: true });
  const liveRideId = liveRideMatch?.params?.rideId;
  const { ride: liveRide } = useRideEvent(liveRideId);

  const liveScopedClubId = useMemo(() => {
    if (!liveRideMatch || liveRide?.clubId == null || liveRide.clubId === '') return null;
    const n = Number(liveRide.clubId);
    return Number.isFinite(n) ? n : null;
  }, [liveRideMatch, liveRide?.clubId]);

  const liveChatScoped = liveScopedClubId != null;

  const threadClubId = useMemo(() => {
    if (liveChatScoped && liveScopedClubId != null) return liveScopedClubId;
    return clubId;
  }, [liveChatScoped, liveScopedClubId, clubId]);

  const summaryQuery = useQuery({
    queryKey: ['clubChat', 'summary'],
    queryFn: () => clubChatApi.getSummary(),
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  const summary = useMemo(() => summaryQuery.data || [], [summaryQuery.data]);

  const notifyHandler = useCallback(
    (payload) => {
      if (!payload || payload.authorUserId === user?.id) return;
      if (
        liveChatScoped &&
        liveScopedClubId != null &&
        Number(payload.clubId) !== Number(liveScopedClubId)
      ) {
        return;
      }
      if (typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;
      if (preferences?.notificationsEnabled === false) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus()) {
        return;
      }
      const title = payload.clubNameHint || payload.clubName || 'Club chat';
      const body = payload.body?.slice(0, 140) || 'New message';
      try {
        const n = new Notification(title, { body, tag: `club-chat-${payload.clubId}` });
        n.onclick = () => {
          window.focus();
          setChatOpen(true);
          if (payload.clubId != null) {
            setClubId(payload.clubId);
          }
          n.close();
        };
      } catch {
        /* ignore */
      }
    },
    [user?.id, preferences?.notificationsEnabled, liveChatScoped, liveScopedClubId, setChatOpen],
  );

  const clubJoinNotifyHandler = useCallback(
    (payload) => {
      queryClient.invalidateQueries({ queryKey: inboxSummaryKeys.all });
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      if (typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;
      if (preferences?.notificationsEnabled === false) return;
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        document.hasFocus()
      ) {
        return;
      }
      const title = payload?.clubName || 'Club';
      const who = payload?.requesterName?.trim() || 'Someone';
      const body = `${who} requested to join`;
      try {
        const n = new Notification(title, { body, tag: `club-join-${payload?.clubId}` });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch {
        /* ignore */
      }
    },
    [preferences?.notificationsEnabled, queryClient],
  );

  useClubChatHub(summary, !!user?.id && !env.isMockApi, {
    onIncomingMessage: notifyHandler,
    onClubJoinRequest: clubJoinNotifyHandler,
    scopedClubId: liveChatScoped ? liveScopedClubId : null,
  });

  const messagesQuery = useQuery({
    queryKey: ['clubChat', 'messages', threadClubId],
    queryFn: () => clubChatApi.getMessages(threadClubId, { take: 100 }),
    enabled: !!threadClubId && open,
  });

  const sendMutation = useMutation({
    mutationFn: ({ clubId: cid, payload }) => clubChatApi.postMessage(cid, payload),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['clubChat', 'messages', v.clubId] });
      queryClient.invalidateQueries({ queryKey: ['clubChat', 'summary'] });
    },
  });

  const messages = useMemo(
    () => (Array.isArray(messagesQuery.data) ? messagesQuery.data : []),
    [messagesQuery.data],
  );

  const openClubThread = useCallback((row) => {
    setClubId(row.clubId);
  }, []);

  useEffect(() => {
    if (!messagesScrollRef.current || !messagesQuery.isSuccess || messages.length === 0) return;
    const el = messagesScrollRef.current;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [threadClubId, messagesQuery.isSuccess, messages.length]);

  useEffect(() => {
    if (!threadClubId || !open || !messagesQuery.isSuccess) return undefined;
    const t = window.setTimeout(() => {
      clubChatApi
        .postRead(threadClubId, { markLatest: true })
        .then(() => queryClient.invalidateQueries({ queryKey: ['clubChat', 'summary'] }))
        .catch(() => {});
    }, 400);
    return () => window.clearTimeout(t);
  }, [threadClubId, open, messagesQuery.isSuccess, messages.length, queryClient]);

  useEffect(() => {
    if (!open) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;
    if (preferences?.notificationsEnabled === false) return;
    const p = Notification.requestPermission();
    if (p && typeof p.then === 'function') {
      p.catch(() => {});
    }
  }, [open, preferences?.notificationsEnabled]);

  const totalUnread = useMemo(() => {
    if (liveChatScoped && liveScopedClubId != null) {
      const row = summary.find((s) => s.clubId === liveScopedClubId);
      return row?.unreadCount ?? 0;
    }
    return summary.reduce((a, r) => a + (r.unreadCount || 0), 0);
  }, [summary, liveChatScoped, liveScopedClubId]);

  const activeClub = useMemo(() => {
    if (!threadClubId) return null;
    const fromSummary = summary.find((s) => s.clubId === threadClubId);
    if (fromSummary) return fromSummary;
    if (liveChatScoped && threadClubId === liveScopedClubId && liveRide?.clubName) {
      return {
        clubId: threadClubId,
        clubName: liveRide.clubName,
        clubAvatarUrl: null,
        unreadCount: 0,
        lastMessagePreview: null,
        lastMessageAt: null,
      };
    }
    return null;
  }, [threadClubId, summary, liveChatScoped, liveScopedClubId, liveRide]);

  const handleSend = useCallback(
    async (payload) => {
      if (!threadClubId) return;
      await sendMutation.mutateAsync({ clubId: threadClubId, payload });
    },
    [threadClubId, sendMutation],
  );

  const closeDock = useCallback(() => setChatOpen(false), [setChatOpen]);

  const showTodayPill = useMemo(() => {
    const today = new Date();
    return messages.some((m) => m.sentAt && isSameCalendarDay(new Date(m.sentAt), today));
  }, [messages]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!user?.id) return null;

  const clubPagePath =
    threadClubId != null ? generatePath(ROUTES.clubDetails, { clubId: String(threadClubId) }) : null;

  return (
    <>
      {!liveRideMatch ? (
        <button
          type="button"
          aria-label="Open club chat"
          onClick={() => toggleChat()}
          className="fixed z-(--rydo-z-chat-fab) hidden h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-rydo-green-bright to-rydo-purple text-[#0d0a1f] shadow-lg shadow-rydo-purple/30 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 active:scale-95 bottom-[max(1rem,var(--rydo-safe-bottom))] right-[max(1rem,var(--rydo-safe-right))] md:flex md:bottom-8 md:right-8"
        >
          <MessageCircle className="h-7 w-7" strokeWidth={2.2} aria-hidden />
          {totalUnread > 0 ? (
            <span className="rydo-unread-pip rydo-unread-pip-lg" aria-hidden>
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          ) : null}
        </button>
      ) : null}

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
            {!threadClubId ? (
              <ClubChatListBold
                summary={summary}
                isLoading={summaryQuery.isLoading}
                onSelectClub={openClubThread}
                onClose={() => setChatOpen(false)}
              />
            ) : (
              <>
                <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-3.5 pb-3 pt-[var(--rydo-bold-page-top)] sm:px-4">
                  {!liveChatScoped ? (
                    <IconButton
                      icon={ArrowLeft}
                      aria-label="Back to conversations"
                      onClick={() => setClubId(null)}
                    />
                  ) : null}
                  <Link
                    to={clubPagePath}
                    onClick={closeDock}
                    className="shrink-0 rounded-full shadow-[0_0_0_2px_rgba(123,92,255,0.4)] outline-none ring-offset-2 ring-offset-[var(--rydo-bg-deep)] focus-visible:ring-2 focus-visible:ring-rydo-purple"
                    aria-label={`View ${activeClub?.clubName || 'club'} page`}
                  >
                    <UserAvatar
                      avatarUrl={activeClub?.clubAvatarUrl}
                      displayName={activeClub?.clubName || 'Club'}
                      sizeClass="h-[38px] w-[38px]"
                      textClass="text-sm"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={clubPagePath}
                      onClick={closeDock}
                      className="block min-w-0 no-underline outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-rydo-purple"
                    >
                      <DisplayTitle as="div" size="sm" className="truncate text-base leading-tight">
                        {activeClub?.clubName || 'Chat'}
                      </DisplayTitle>
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fg-subtle">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-rydo-green-bright shadow-[0_0_8px_var(--rydo-green-bright)]"
                        aria-hidden
                      />
                      <span>Club group chat</span>
                    </div>
                  </div>
                  {clubPagePath ? (
                    <Link
                      to={clubPagePath}
                      onClick={closeDock}
                      className="rydo-iconbtn shrink-0"
                      aria-label="View club"
                    >
                      <Users className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
                    </Link>
                  ) : (
                    <IconButton icon={Users} aria-label="View club" disabled />
                  )}
                  <IconButton
                    icon={X}
                    aria-label="Close chat"
                    onClick={() => setChatOpen(false)}
                  />
                </header>

                <div
                  ref={messagesScrollRef}
                  className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3.5 py-3.5"
                >
                  {messagesQuery.isLoading ? (
                    <p className="rydo-subtle text-sm">Loading messages…</p>
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
                        const isMine = Number(m.authorUserId) === Number(user?.id);
                        const profileTo =
                          m.authorHandle
                            ? userProfilePath(m.authorHandle)
                            : null;
                        return (
                          <ClubChatMessageBubble
                            key={m.id}
                            message={m}
                            isMine={isMine}
                            profileTo={profileTo}
                            onProfileClick={closeDock}
                          />
                        );
                      })}
                    </>
                  )}
                </div>

                <ClubChatComposer
                  clubId={threadClubId}
                  disabled={sendMutation.isPending}
                  onSend={handleSend}
                />
              </>
            )}
          </MotionDiv>
        ) : null}
      </AnimatePresence>
    </>
  );
}
