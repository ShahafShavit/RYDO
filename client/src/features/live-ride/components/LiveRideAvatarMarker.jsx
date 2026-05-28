import { initialsFromDisplayName } from '@/features/live-ride/utils/liveRideNearbyPeers';

/**
 * @param {object} props
 * @param {string} props.name
 * @param {string | null | undefined} props.avatarUrl
 * @param {boolean} [props.isSelf]
 * @param {boolean} [props.stale] — peer lost live updates; grayscale + reduced opacity
 * @param {number | null | undefined} props.headingDeg — when set (self only), rotates the marker shell to match travel direction
 */
export default function LiveRideAvatarMarker({ name, avatarUrl, isSelf = false, stale = false, headingDeg }) {
  const initials = initialsFromDisplayName(name);
  const ring = isSelf
    ? 'ring-2 ring-[#3ecfb9] ring-offset-2 ring-offset-[#0a0908]'
    : stale
      ? 'ring-2 ring-white/25 ring-offset-2 ring-offset-[#0a0908]'
      : 'ring-2 ring-amber-400/90 ring-offset-2 ring-offset-[#0a0908]';
  const staleClass = stale && !isSelf ? 'opacity-50 grayscale' : '';

  return (
    <div
      className="pointer-events-none flex flex-col items-center"
      style={
        isSelf && headingDeg != null && Number.isFinite(headingDeg)
          ? { transform: `rotate(${headingDeg}deg)` }
          : undefined
      }
    >
      <div
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-elevated text-xs font-semibold text-fg shadow-md ${ring} ${staleClass}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span className="tabular-nums tracking-tight">{initials}</span>
        )}
      </div>
      {!isSelf && avatarUrl ? (
        <span className="mt-0.5 rounded-md bg-black/55 px-1 py-px text-[10px] font-semibold tabular-nums tracking-tight text-white shadow-sm ring-1 ring-amber-400/40">
          {initials}
        </span>
      ) : null}
    </div>
  );
}
