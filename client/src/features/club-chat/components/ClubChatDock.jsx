import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePreferences } from '@/features/account/hooks/useAccount';
import { env } from '@/shared/config/env';
import { clubChatApi } from '@/features/club-chat/api/club-chat-api';
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
  const [open, setOpen] = useState(false);
  const [clubId, setClubId] = useState(null);

  const summaryQuery = useQuery({
    queryKey: ['clubChat', 'summary'],
    queryFn: () => clubChatApi.getSummary(),
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  const summary = summaryQuery.data || [];

  const notifyHandler = useCallback(
    (payload) => {
      if (!payload || payload.authorUserId === user?.id) return;
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
          setOpen(true);
          if (payload.clubId != null) setClubId(payload.clubId);
          n.close();
        };
      } catch {
        /* ignore */
      }
    },
    [user?.id, preferences?.notificationsEnabled]
  );

  useClubChatHub(summary, !!user?.id && !env.isMockApi, {
    onIncomingMessage: notifyHandler,
  });

  const messagesQuery = useQuery({
    queryKey: ['clubChat', 'messages', clubId],
    queryFn: () => clubChatApi.getMessages(clubId, {}),
    enabled: !!clubId && open,
  });

  const sendMutation = useMutation({
    mutationFn: ({ clubId: cid, payload }) => clubChatApi.postMessage(cid, payload),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['clubChat', 'messages', v.clubId] });
      queryClient.invalidateQueries({ queryKey: ['clubChat', 'summary'] });
    },
  });

  const messages = Array.isArray(messagesQuery.data) ? messagesQuery.data : [];

  useEffect(() => {
    if (!clubId || !open || !messagesQuery.isSuccess) return undefined;
    const t = window.setTimeout(() => {
      clubChatApi
        .postRead(clubId, { markLatest: true })
        .then(() => queryClient.invalidateQueries({ queryKey: ['clubChat', 'summary'] }))
        .catch(() => {});
    }, 400);
    return () => window.clearTimeout(t);
  }, [clubId, open, messagesQuery.isSuccess, messages.length, queryClient]);

  const totalUnread = useMemo(() => summary.reduce((a, r) => a + (r.unreadCount || 0), 0), [summary]);

  const activeClub = useMemo(
    () => (clubId ? summary.find((s) => s.clubId === clubId) : null),
    [clubId, summary]
  );

  const handleSend = useCallback(
    async (payload) => {
      if (!clubId) return;
      await sendMutation.mutateAsync({ clubId, payload });
    },
    [clubId, sendMutation]
  );

  const requestDesktopAlerts = useCallback(() => {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission();
  }, []);

  if (!user?.id) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Open club chat"
        onClick={() => setOpen((o) => !o)}
        className="fixed z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-rydo-purple text-white shadow-lg shadow-rydo-purple/30 md:bottom-8 md:right-8 bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]"
      >
        <MessageCircle className="h-7 w-7" aria-hidden />
        {totalUnread > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className="fixed z-[101] flex flex-col border border-border bg-[var(--rydo-bg-deep)] shadow-2xl md:bottom-24 md:right-8 md:h-[min(560px,calc(100vh-8rem))] md:w-[400px] inset-x-0 bottom-0 h-[100dvh] w-full md:inset-auto rounded-t-2xl md:rounded-2xl"
          >
            <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-3 sm:px-4">
              {clubId ? (
                <>
                  <button
                    type="button"
                    aria-label="Back to clubs"
                    className="shrink-0 rounded-lg p-2 text-fg-muted hover:bg-surface hover:text-fg"
                    onClick={() => setClubId(null)}
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                  </button>
                  <UserAvatar
                    avatarUrl={activeClub?.clubAvatarUrl}
                    displayName={activeClub?.clubName || 'Club'}
                    sizeClass="h-9 w-9"
                    textClass="text-xs"
                    className="shrink-0"
                  />
                  <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">
                    {activeClub?.clubName || 'Chat'}
                  </h2>
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
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            {!clubId ? (
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
                        onClick={() => setClubId(row.clubId)}
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
                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {messagesQuery.isLoading ? (
                    <p className="text-sm text-fg-muted">Loading messages…</p>
                  ) : (
                    messages.map((m) => {
                      const isMine = Number(m.authorUserId) === Number(user?.id);
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
                            <UserAvatar
                              avatarUrl={m.authorAvatarUrl}
                              displayName={m.authorDisplayName || 'Member'}
                              sizeClass="h-7 w-7"
                              textClass="text-[9px]"
                              className="shrink-0"
                            />
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
                                {isMine ? 'You' : m.authorDisplayName}
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
                  clubId={clubId}
                  disabled={sendMutation.isPending}
                  onSend={handleSend}
                />
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
