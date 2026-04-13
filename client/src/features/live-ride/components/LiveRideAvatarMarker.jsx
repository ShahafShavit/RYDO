import { initialsFromDisplayName } from '@/features/live-ride/utils/liveRideNearbyPeers';

/**
 * @param {object} props
 * @param {string} props.name
 * @param {string | null | undefined} props.avatarUrl
 * @param {boolean} [props.isSelf]
 * @param {number | null | undefined} props.headingDeg — when set (self only), rotates the marker shell to match travel direction
 */
export default function LiveRideAvatarMarker({ name, avatarUrl, isSelf = false, headingDeg }) {
  const initials = initialsFromDisplayName(name);
  const ring = isSelf ? 'ring-2 ring-[#3ecfb9] ring-offset-2 ring-offset-[#0a0908]' : 'ring-2 ring-amber-400/90 ring-offset-2 ring-offset-[#0a0908]';

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
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-elevated text-xs font-semibold text-fg shadow-md ${ring}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span className="tabular-nums tracking-tight">{initials}</span>
        )}
      </div>
    </div>
  );
}
