import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, generatePath } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import { userProfilePath } from '@/shared/lib/user-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { clubChatApi } from '@/features/club-chat/api/club-chat-api';
import ClubChatMessageBubble from '@/features/club-chat/components/ClubChatMessageBubble';
import ClubChatComposer from '@/features/club-chat/components/ClubChatComposer';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import IconButton from '@/shared/components/bold/IconButton';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { isSameCalendarDay } from '@/features/club-chat/utils/formatChatTime';

export default function ClubChatThread({
  clubId,
  activeClub,
  onBack,
  hideBack = false,
  className,
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesScrollRef = useRef(null);

  const messagesQuery = useQuery({
    queryKey: ['clubChat', 'messages', clubId],
    queryFn: () => clubChatApi.getMessages(clubId, { take: 100 }),
    enabled: !!clubId,
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

  useEffect(() => {
    if (!messagesScrollRef.current || !messagesQuery.isSuccess || messages.length === 0) return;
    const el = messagesScrollRef.current;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [clubId, messagesQuery.isSuccess, messages.length]);

  useEffect(() => {
    if (!clubId || !messagesQuery.isSuccess) return undefined;
    const t = window.setTimeout(() => {
      clubChatApi
        .postRead(clubId, { markLatest: true })
        .then(() => queryClient.invalidateQueries({ queryKey: ['clubChat', 'summary'] }))
        .catch(() => {});
    }, 400);
    return () => window.clearTimeout(t);
  }, [clubId, messagesQuery.isSuccess, messages.length, queryClient]);

  const handleSend = useCallback(
    async (payload) => {
      if (!clubId) return;
      await sendMutation.mutateAsync({ clubId, payload });
    },
    [clubId, sendMutation],
  );

  const showTodayPill = useMemo(() => {
    const today = new Date();
    return messages.some((m) => m.sentAt && isSameCalendarDay(new Date(m.sentAt), today));
  }, [messages]);

  const clubPagePath =
    clubId != null ? generatePath(ROUTES.clubDetails, { clubId: String(clubId) }) : null;

  return (
    <div className={className ?? 'flex min-h-0 flex-1 flex-col overflow-hidden'} dir="ltr">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-3.5 pb-3 pt-[var(--rydo-bold-page-top)] sm:px-4">
        {!hideBack && onBack ? (
          <IconButton
            icon={ArrowLeft}
            aria-label="Back to conversations"
            onClick={onBack}
          />
        ) : null}
        <Link
          to={clubPagePath}
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
            className="rydo-iconbtn shrink-0"
            aria-label="View club"
          >
            <Users className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          </Link>
        ) : (
          <IconButton icon={Users} aria-label="View club" disabled />
        )}
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
              const profileTo = m.authorHandle ? userProfilePath(m.authorHandle) : null;
              return (
                <ClubChatMessageBubble
                  key={m.id}
                  message={m}
                  isMine={isMine}
                  profileTo={profileTo}
                />
              );
            })}
          </>
        )}
      </div>

      <ClubChatComposer
        clubId={clubId}
        disabled={sendMutation.isPending}
        onSend={handleSend}
      />
    </div>
  );
}
