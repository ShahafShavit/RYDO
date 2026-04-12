import { Link, useParams } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUserProfile } from '@/features/users/hooks/useUserProfile';
import Button from '@/shared/components/ui/button/Button';
import { ApiError } from '@/shared/api/api-errors';
import { UserProfilePublicCard } from '@/features/users/components/UserProfilePublicCard';

export default function UserProfilePage() {
  const { userId } = useParams();
  const id = Number(userId);
  const { user: current } = useAuth();
  const { data: profile, isLoading, isError, error } = useUserProfile(userId);

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

  return (
    <section className="max-w-4xl space-y-6">
      <h1 className="sr-only">{profile.fullName || 'Rider'}</h1>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
          Member
        </span>
        {isOwn ? (
          <Link to={`${ROUTES.settings}?tab=profile`} className="shrink-0">
            <Button variant="secondary">Edit profile</Button>
          </Link>
        ) : null}
      </div>

      <UserProfilePublicCard profile={profile} userId={userId} />
    </section>
  );
}
