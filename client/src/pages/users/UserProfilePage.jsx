import { useMemo } from 'react';
import { Link, useParams, generatePath } from 'react-router-dom';
import { QRCode } from 'react-qr-code';
import { MapPin, Mail, Calendar, User } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUserProfile } from '@/features/users/hooks/useUserProfile';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import { ApiError } from '@/shared/api/api-errors';

/** Fixed English locale so labels like "Member since" are not mixed with RTL/local month names. */
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

export default function UserProfilePage() {
  const { userId } = useParams();
  const id = Number(userId);
  const { user: current } = useAuth();
  const { data: profile, isLoading, isError, error } = useUserProfile(userId);

  const shareUrl = useMemo(() => {
    const path = generatePath(ROUTES.userProfile, { userId: String(userId ?? '') });
    if (typeof window === 'undefined') return path;
    try {
      return new URL(path, window.location.origin).href;
    } catch {
      return path;
    }
  }, [userId]);

  const isOwn = current?.id === id;

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Invalid profile</h1>
        <p className="text-white/60">This user link is not valid.</p>
        <Link to={ROUTES.dashboard}>
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="space-y-4">
        <p className="text-white/60">Loading profile…</p>
      </section>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    if (notFound) {
      return (
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold text-white">User not found</h1>
          <p className="text-white/60">No account matches this profile.</p>
          <Link to={ROUTES.dashboard}>
            <Button variant="secondary">Back to dashboard</Button>
          </Link>
        </section>
      );
    }
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Could not load profile</h1>
        <p className="text-white/60">{error?.message || 'Something went wrong.'}</p>
        <Link to={ROUTES.dashboard}>
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="space-y-4">
        <p className="text-white/60">Loading profile…</p>
      </section>
    );
  }

  const showEmail = profile.email != null && String(profile.email).trim() !== '';
  const showBio = profile.bio != null && String(profile.bio).trim() !== '';
  const showLocation = profile.location != null && String(profile.location).trim() !== '';
  const showCreated = profile.createdAt != null && String(profile.createdAt).trim() !== '';
  const avatar = profile.avatarUrl?.trim() || null;

  return (
    <section className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/50">Member</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{profile.fullName || 'Rider'}</h1>
        </div>
        {isOwn ? (
          <Link to={`${ROUTES.settings}?tab=profile`}>
            <Button variant="secondary">Edit profile</Button>
          </Link>
        ) : null}
      </div>

      <Card className="p-6 sm:p-8 bg-white/5 border-white/10">
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
                  {isOwn
                    ? 'You have not shared any public profile details yet. Add a bio or visibility in settings.'
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
    </section>
  );
}
