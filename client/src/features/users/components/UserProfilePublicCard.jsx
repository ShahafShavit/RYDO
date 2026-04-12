import { useMemo, useState, useCallback } from 'react';
import { generatePath } from 'react-router-dom';
import { QRCode } from 'react-qr-code';
import { MapPin, Mail, Calendar, Bike, Link2, Check } from 'lucide-react';
import { formatBikeTypeLabel } from '@/features/account/utils/bikeTypeLabel';
import { ROUTES } from '@/app/router/route-paths';
import Card from '@/shared/components/ui/card/Card';

function getDisplayName(profile) {
  const full = profile?.fullName?.trim();
  if (full) return full;
  const fn = profile?.firstName?.trim();
  const ln = profile?.lastName?.trim();
  const parts = [fn, ln].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Member';
}

function getProfileInitials(profile) {
  const full = profile?.fullName?.trim();
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return full.slice(0, 2).toUpperCase();
  }
  const a = profile?.firstName?.trim()?.[0];
  const b = profile?.lastName?.trim()?.[0];
  if (a && b) return `${a}${b}`.toUpperCase();
  if (a) return a.toUpperCase();
  return '?';
}

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
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    const path = generatePath(ROUTES.userProfile, { userId: String(userId ?? '') });
    if (typeof window === 'undefined') return path;
    try {
      return new URL(path, window.location.origin).href;
    } catch {
      return path;
    }
  }, [userId]);

  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [shareUrl]);

  const showEmail = profile.email != null && String(profile.email).trim() !== '';
  const showBio = profile.bio != null && String(profile.bio).trim() !== '';
  const showLocation = profile.location != null && String(profile.location).trim() !== '';
  const showCreated = profile.createdAt != null && String(profile.createdAt).trim() !== '';
  const showBike =
    profile.defaultBikeType != null && String(profile.defaultBikeType).trim() !== '';
  const bikeLabel = showBike ? formatBikeTypeLabel(profile.defaultBikeType) : '';
  const avatar = profile.avatarUrl?.trim() || null;
  const initials = getProfileInitials(profile);
  const displayName = getDisplayName(profile);
  const hasDetails = showLocation || showEmail || showCreated || showBike;

  return (
    <Card className={`overflow-hidden border-white/10 bg-white/[0.04] p-0 sm:p-0 ${className ?? ''}`}>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-stretch">
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-10 sm:p-8">
          <div className="flex shrink-0 flex-col items-center sm:w-[7.75rem]">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="h-28 w-28 rounded-full border-2 border-white/15 object-cover shadow-lg shadow-black/20 ring-2 ring-white/5 sm:h-[7.5rem] sm:w-[7.5rem]"
              />
            ) : (
              <div
                className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-white/15 bg-gradient-to-br from-[#7B5CFF] to-[#5a3fd4] text-xl font-semibold tracking-tight text-white shadow-lg shadow-[#7B5CFF]/25 ring-2 ring-white/10 sm:h-[7.5rem] sm:w-[7.5rem] sm:text-2xl"
                aria-hidden
              >
                {initials}
              </div>
            )}
            <p className="mt-3 max-w-[11rem] text-center text-lg font-semibold leading-snug tracking-tight text-white sm:max-w-[min(100%,12rem)]">
              {displayName}
            </p>
          </div>
          <div className="min-w-0 flex-1 space-y-0">
            {showBio || hasDetails ? (
              <div className="rounded-2xl border border-white/[0.08] bg-black/25">
                {showBio ? (
                  <div
                    className={`px-4 py-4 sm:px-5 sm:py-5 ${hasDetails ? 'border-b border-white/[0.06]' : ''}`}
                  >
                    <p className="text-[15px] leading-[1.65] text-white/[0.9] whitespace-pre-wrap">{profile.bio}</p>
                  </div>
                ) : null}
                {hasDetails ? (
                  <div className="px-4 py-1 sm:px-4">
                {showLocation ? (
                  <div className="flex items-start gap-3 border-b border-white/[0.06] py-3.5 text-sm leading-snug text-white/[0.92] last:border-b-0">
                    <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#7B5CFF]/90" strokeWidth={2} aria-hidden />
                    <span>{profile.location}</span>
                  </div>
                ) : null}
                {showEmail ? (
                  <div className="flex items-start gap-3 border-b border-white/[0.06] py-3.5 text-sm leading-snug text-white/[0.92] last:border-b-0">
                    <Mail className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#7B5CFF]/90" strokeWidth={2} aria-hidden />
                    <span className="min-w-0 break-words">{profile.email}</span>
                  </div>
                ) : null}
                {showCreated ? (
                  <div className="flex items-start gap-3 border-b border-white/[0.06] py-3.5 text-sm leading-snug text-white/[0.92] last:border-b-0">
                    <Calendar className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#7B5CFF]/90" strokeWidth={2} aria-hidden />
                    <span>
                      Member since{' '}
                      <time dateTime={String(profile.createdAt)}>{formatMemberSince(profile.createdAt)}</time>
                    </span>
                  </div>
                ) : null}
                {showBike ? (
                  <div className="flex items-center gap-3 py-3.5">
                    <Bike className="h-[18px] w-[18px] shrink-0 text-[#7B5CFF]/90" strokeWidth={2} aria-hidden />
                    <span className="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-xs font-medium text-white/90">
                      {bikeLabel}
                    </span>
                  </div>
                ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {!showBio && !showLocation && !showEmail && !showCreated && !showBike ? (
              <p className="text-sm text-white/50">
                {profile.isSelf
                  ? (ownerEmptyHint ??
                    'You have not shared any public profile details yet. Add a bio or visibility in settings.')
                  : 'This member has not shared any public profile details.'}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col items-center justify-center border-t border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6 text-center sm:p-8 lg:border-l lg:border-t-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-white">Share profile</h2>
          <div className="mt-5">
            <div className="rounded-2xl bg-white p-3.5 shadow-md shadow-black/25">
              <QRCode value={shareUrl} size={144} level="M" />
            </div>
          </div>
          <button
            type="button"
            onClick={copyShareLink}
            className="mt-5 inline-flex w-full max-w-[220px] items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-white/90 transition hover:border-white/20 hover:bg-white/[0.1]"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" aria-hidden /> : <Link2 className="h-4 w-4 text-white/70" aria-hidden />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>
    </Card>
  );
}
