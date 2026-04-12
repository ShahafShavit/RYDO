import { useMemo } from 'react';
import { generatePath } from 'react-router-dom';
import { QRCode } from 'react-qr-code';
import { MapPin, Mail, Calendar, User } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import Card from '@/shared/components/ui/card/Card';

function formatMemberSince(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

/**
 * Public profile card (avatar, about, contact rows, share QR) — same on /users/:id and settings preview.
 * @param {string} [ownerEmptyHint] — when the viewer is the profile owner and fields are empty; default mentions settings.
 */
export function UserProfilePublicCard({ profile, userId, className, ownerEmptyHint }) {
  const shareUrl = useMemo(() => {
    const path = generatePath(ROUTES.userProfile, { userId: String(userId ?? '') });
    if (typeof window === 'undefined') return path;
    try {
      return new URL(path, window.location.origin).href;
    } catch {
      return path;
    }
  }, [userId]);

  const showEmail = profile.email != null && String(profile.email).trim() !== '';
  const showBio = profile.bio != null && String(profile.bio).trim() !== '';
  const showLocation = profile.location != null && String(profile.location).trim() !== '';
  const showCreated = profile.createdAt != null && String(profile.createdAt).trim() !== '';
  const avatar = profile.avatarUrl?.trim() || null;

  return (
    <Card className={`p-6 sm:p-8 bg-white/5 border-white/10 ${className ?? ''}`}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div className="flex min-w-0 flex-1 flex-col gap-6 sm:flex-row">
          <div className="shrink-0">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="h-24 w-24 rounded-full border border-white/15 object-cover bg-white/10"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-[#7B5CFF]/20 text-[#7B5CFF]">
                <User className="h-10 w-10" aria-hidden />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-5">
            {showBio ? (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">About</p>
                <p className="mt-2 text-[15px] leading-relaxed text-white/90 whitespace-pre-wrap">{profile.bio}</p>
              </div>
            ) : null}

            <div className="space-y-3.5">
              {showLocation ? (
                <div className="flex items-start gap-3.5 text-sm leading-relaxed text-white/[0.92]">
                  <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-white/50" strokeWidth={2} aria-hidden />
                  <span>{profile.location}</span>
                </div>
              ) : null}
              {showEmail ? (
                <div className="flex items-start gap-3.5 text-sm leading-relaxed text-white/[0.92]">
                  <Mail className="mt-0.5 h-[18px] w-[18px] shrink-0 text-white/50" strokeWidth={2} aria-hidden />
                  <span className="min-w-0 break-all">{profile.email}</span>
                </div>
              ) : null}
              {showCreated ? (
                <div className="flex items-start gap-3.5 text-sm leading-relaxed text-white/[0.92]">
                  <Calendar className="mt-0.5 h-[18px] w-[18px] shrink-0 text-white/50" strokeWidth={2} aria-hidden />
                  <span>
                    Member since{' '}
                    <time dateTime={String(profile.createdAt)}>{formatMemberSince(profile.createdAt)}</time>
                  </span>
                </div>
              ) : null}
            </div>

            {!showBio && !showLocation && !showEmail && !showCreated ? (
              <p className="text-white/50 text-sm">
                {profile.isSelf
                  ? (ownerEmptyHint ??
                    'You have not shared any public profile details yet. Add a bio or visibility in settings.')
                  : 'This member has not shared any public profile details.'}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 shrink-0 flex-col items-stretch border-t border-white/10 pt-8 lg:w-56 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <h2 className="text-base font-semibold text-white">Share profile</h2>
          <p className="mt-1.5 text-sm leading-snug text-white/60">Scan to open this profile in RYDO.</p>
          <div className="mt-4 self-start rounded-xl bg-white p-3 shadow-sm">
            <QRCode value={shareUrl} size={152} level="M" />
          </div>
          <p className="mt-4 break-all font-mono text-xs leading-relaxed text-white/55">{shareUrl}</p>
        </div>
      </div>
    </Card>
  );
}
