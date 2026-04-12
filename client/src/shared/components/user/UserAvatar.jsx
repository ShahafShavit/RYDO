import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { getUserAvatarInitials } from '@/shared/components/user/user-avatar-initials';

function InitialsFallback({ initials, sizeClass, textClass, className }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border border-white/12 bg-[#7B5CFF]/20 font-semibold text-white/90',
        sizeClass,
        textClass,
        className,
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}

function AvatarImage({ src, initials, sizeClass, textClass, className }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <InitialsFallback initials={initials} sizeClass={sizeClass} textClass={textClass} className={className} />;
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className={cn(
        'shrink-0 rounded-full border border-white/12 object-cover bg-white/10',
        sizeClass,
        className,
      )}
    />
  );
}

/**
 * Small circular avatar: image when avatarUrl is set, else initials from displayName.
 */
export default function UserAvatar({
  avatarUrl,
  displayName,
  className,
  sizeClass = 'h-8 w-8',
  textClass = 'text-[11px]',
}) {
  const initials = getUserAvatarInitials(displayName);
  const src = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
  if (!src) {
    return <InitialsFallback initials={initials} sizeClass={sizeClass} textClass={textClass} className={className} />;
  }
  return (
    <AvatarImage
      key={src}
      src={src}
      initials={initials}
      sizeClass={sizeClass}
      textClass={textClass}
      className={className}
    />
  );
}
