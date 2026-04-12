import { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/cn';

export function getInitials(displayName) {
  if (!displayName || typeof displayName !== 'string') return '?';
  const t = displayName.trim();
  if (!t) return '?';
  return t
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
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
  const initials = getInitials(displayName);
  const [imgFailed, setImgFailed] = useState(false);
  const src = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
  useEffect(() => {
    setImgFailed(false);
  }, [src]);
  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setImgFailed(true)}
        className={cn(
          'shrink-0 rounded-full border border-white/12 object-cover bg-white/10',
          sizeClass,
          className
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border border-white/12 bg-[#7B5CFF]/20 font-semibold text-white/90',
        sizeClass,
        textClass,
        className
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}
