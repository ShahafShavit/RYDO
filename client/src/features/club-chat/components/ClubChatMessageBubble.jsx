import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import ClubChatMessageBody from '@/features/club-chat/components/ClubChatMessageBody';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { formatMessageTime } from '@/features/club-chat/utils/formatChatTime';
export default function ClubChatMessageBubble({
  message,
  isMine,
  profileTo,
  onProfileClick,
}) {
  const nameLabel = isMine ? 'You' : message.authorDisplayName;
  const time = formatMessageTime(message.sentAt);

  if (isMine) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[82%] rounded-[18px_18px_5px_18px] border border-rydo-purple/45 bg-rydo-purple/18 px-3.5 py-2"
        >
          <ClubChatMessageBody body={message.body} mentions={message.mentions} mine />
          {time ? (
            <div className="mt-0.5 text-right text-[9.5px] text-[rgba(202,191,255,0.8)]">{time}</div>
          ) : null}
        </div>
      </div>
    );
  }

  const avatar = (
    <UserAvatar
      avatarUrl={message.authorAvatarUrl}
      displayName={message.authorDisplayName || 'Member'}
      sizeClass="h-7 w-7"
      textClass="text-[10px]"
      className="shrink-0"
    />
  );

  return (
    <div className="flex items-end gap-2">
      {profileTo ? (
        <Link
          to={profileTo}
          onClick={onProfileClick}
          className="shrink-0 rounded-full outline-none ring-offset-2 ring-offset-[var(--rydo-bg-deep)] focus-visible:ring-2 focus-visible:ring-rydo-purple"
          aria-label={`View ${message.authorDisplayName || 'member'} profile`}
        >
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      <div className="max-w-[82%] rounded-[18px_18px_18px_5px] border border-border bg-black/20 px-3.5 py-2">
        <div className="mb-0.5 flex items-baseline gap-1.5">
          {profileTo ? (
            <Link
              to={profileTo}
              onClick={onProfileClick}
              className="text-[11.5px] font-semibold text-fg-muted no-underline hover:underline outline-none focus-visible:ring-2 focus-visible:ring-rydo-purple rounded-sm"
            >
              {nameLabel}
            </Link>
          ) : (
            <b className="text-[11.5px] font-semibold text-fg-muted">{nameLabel}</b>
          )}
          {time ? <span className="text-[9.5px] text-fg-subtle">{time}</span> : null}
        </div>
        <ClubChatMessageBody body={message.body} mentions={message.mentions} />
      </div>
    </div>
  );
}
