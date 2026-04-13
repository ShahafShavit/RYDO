import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, generatePath, useMatch } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';

const MotionDiv = motion.div;
import { MessageCircle, X, ChevronLeft } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import { useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePreferences } from '@/features/account/hooks/useAccount';
import { env } from '@/shared/config/env';
import { clubChatApi } from '@/features/club-chat/api/club-chat-api';
import { useClubChatUi } from '@/features/club-chat/club-chat-ui-context';
import { useClubChatHub } from '@/features/club-chat/hooks/useClubChatHub';
import ClubChatMessageBody from '@/features/club-chat/components/ClubChatMessageBody';
import ClubChatComposer from '@/features/club-chat/components/ClubChatComposer';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { cn } from '@/shared/lib/cn';

function formatPreviewTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

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
    [user?.id, preferences?.notificationsEnabled, liveChatScoped, liveScopedClubId, setChatOpen]
  );

  useClubChatHub(summary, !!user?.id && !env.isMockApi, {
    onIncomingMessage: notifyHandler,
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

  const messages = Array.isArray(messagesQuery.data) ? messagesQuery.data : [];

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
    [threadClubId, sendMutation]
  );

  const requestDesktopAlerts = useCallback(() => {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission();
  }, []);

  const closeDock = useCallback(() => setChatOpen(false), [setChatOpen]);

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
          className="fixed z-[100] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-rydo-purple text-white shadow-lg shadow-rydo-purple/30 transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 hover:border-white/25 hover:shadow-xl hover:shadow-rydo-purple/40 active:scale-95 bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] md:bottom-8 md:right-8"
        >
          <MessageCircle className="h-7 w-7" aria-hidden />
          {totalUnread > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
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
            className="fixed z-[101] flex flex-col border border-border bg-[var(--rydo-bg-deep)] shadow-2xl md:bottom-24 md:right-8 md:h-[min(560px,calc(100vh-8rem))] md:w-[400px] inset-x-0 bottom-0 h-[100dvh] w-full md:inset-auto rounded-t-2xl md:rounded-2xl"
          >
            <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-3 sm:px-4">
              {threadClubId ? (
                <>
                  {!liveChatScoped ? (
                    <button
                      type="button"
                      aria-label="Back to clubs"
                      className="shrink-0 rounded-lg p-2 text-fg-muted hover:bg-surface hover:text-fg"
                      onClick={() => {
                        setClubId(null);
                      }}
                    >
                      <ChevronLeft className="h-5 w-5" aria-hidden />
                    </button>
                  ) : null}
                  <Link
                    to={clubPagePath}
                    onClick={closeDock}
                    className="shrink-0 rounded-full outline-none ring-offset-2 ring-offset-[var(--rydo-bg-deep)] focus-visible:ring-2 focus-visible:ring-rydo-purple"
                    aria-label={`View ${activeClub?.clubName || 'club'} page`}
                  >
                    <UserAvatar
                      avatarUrl={activeClub?.clubAvatarUrl}
                      displayName={activeClub?.clubName || 'Club'}
                      sizeClass="h-9 w-9"
                      textClass="text-xs"
                      className="shrink-0"
                    />
                  </Link>
                  <Link
                    to={clubPagePath}
                    onClick={closeDock}
                    className="min-w-0 flex-1 truncate text-sm font-semibold text-fg hover:underline outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-rydo-purple focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--rydo-bg-deep)]"
                  >
                    <h2 className="truncate">{activeClub?.clubName || 'Chat'}</h2>
                  </Link>
                </>
              ) : (
                <h2 className="flex-1 text-sm font-semibold text-fg pl-1">Club chat</h2>
              )}
              {typeof Notification !== 'undefined' && Notification.permission === 'default' ? (
                <button
                  type="button"
                  className="hidden sm:inline text-xs text-rydo-green hover:underline"
                  onClick={requestDesktopAlerts}
                >
                  Alerts
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Close chat"
                className="shrink-0 rounded-lg p-2 text-fg-muted hover:bg-surface"
                onClick={() => setChatOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            {!threadClubId ? (
              <ul className="flex-1 overflow-y-auto p-2">
                {summaryQuery.isLoading ? (
                  <li className="px-3 py-4 text-sm text-fg-muted">Loading…</li>
                ) : summary.length === 0 ? (
                  <li className="px-3 py-4 text-sm text-fg-muted">Join a club to use chat.</li>
                ) : (
                  summary.map((row) => (
                    <li key={row.clubId}>
                      <button
                        type="button"
                        className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface transition-colors"
                        onClick={() => openClubThread(row)}
                      >
                        <UserAvatar
                          avatarUrl={row.clubAvatarUrl}
                          displayName={row.clubName || 'Club'}
                          sizeClass="h-11 w-11"
                          textClass="text-sm"
                          className="shrink-0 mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate font-medium text-fg">{row.clubName}</span>
                            {row.lastMessageAt ? (
                              <span className="shrink-0 text-[10px] text-fg-subtle tabular-nums">
                                {formatPreviewTime(row.lastMessageAt)}
                              </span>
                            ) : null}
                          </div>
                          {row.lastMessagePreview ? (
                            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-fg-muted">
                              {row.lastMessagePreview}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-xs italic text-fg-subtle">No messages yet</p>
                          )}
                        </div>
                        {row.unreadCount > 0 ? (
                          <span className="mt-1 shrink-0 rounded-full bg-rydo-purple/25 px-2 py-0.5 text-xs font-semibold text-rydo-purple">
                            {row.unreadCount > 99 ? '99+' : row.unreadCount}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <>
                <div
                  ref={messagesScrollRef}
                  className="flex-1 space-y-3 overflow-y-auto p-3"
                >
                  {messagesQuery.isLoading ? (
                    <p className="text-sm text-fg-muted">Loading messages…</p>
                  ) : (
                    messages.map((m) => {
                      const isMine = Number(m.authorUserId) === Number(user?.id);
                      const authorId = m.authorUserId;
                      const profileTo =
                        authorId != null && authorId !== ''
                          ? generatePath(ROUTES.userProfile, { userId: String(authorId) })
                          : null;
                      const avatarEl = (
                        <UserAvatar
                          avatarUrl={m.authorAvatarUrl}
                          displayName={m.authorDisplayName || 'Member'}
                          sizeClass="h-7 w-7"
                          textClass="text-[9px]"
                          className="shrink-0"
                        />
                      );
                      const nameLabel = isMine ? 'You' : m.authorDisplayName;
                      return (
                        <div
                          key={m.id}
                          className={cn('flex w-full', isMine ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'flex max-w-[min(92%,20rem)] items-end gap-2',
                              isMine ? 'flex-row-reverse' : 'flex-row'
                            )}
                          >
                            {profileTo ? (
                              <Link
                                to={profileTo}
                                onClick={closeDock}
                                className="shrink-0 rounded-full outline-none ring-offset-2 ring-offset-[var(--rydo-bg-deep)] focus-visible:ring-2 focus-visible:ring-rydo-purple"
                                aria-label={`View ${m.authorDisplayName || 'member'} profile`}
                              >
                                {avatarEl}
                              </Link>
                            ) : (
                              avatarEl
                            )}
                            <article
                              className={cn(
                                'min-w-0 flex-1 rounded-2xl border px-3 py-2',
                                isMine
                                  ? 'border-rydo-purple/45 bg-rydo-purple/18 text-fg'
                                  : 'border-border/70 bg-black/20 text-fg'
                              )}
                            >
                              <p
                                className={cn(
                                  'text-xs font-medium',
                                  isMine ? 'text-rydo-purple/95' : 'text-fg-muted'
                                )}
                              >
                                {profileTo ? (
                                  <Link
                                    to={profileTo}
                                    onClick={closeDock}
                                    className={cn(
                                      'rounded-sm hover:underline outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--rydo-bg-deep)]',
                                      isMine ? 'text-rydo-purple/95' : 'text-fg-muted'
                                    )}
                                  >
                                    {nameLabel}
                                  </Link>
                                ) : (
                                  nameLabel
                                )}
                                <span className="ml-2 text-[10px] opacity-70">
                                  {m.sentAt ? new Date(m.sentAt).toLocaleString() : ''}
                                </span>
                              </p>
                              <ClubChatMessageBody body={m.body} mentions={m.mentions} />
                            </article>
                          </div>
                        </div>
                      );
                    })
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
