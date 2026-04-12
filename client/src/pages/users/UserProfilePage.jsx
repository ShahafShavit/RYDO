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

      <UserProfilePublicCard profile={profile} userId={userId} />
    </section>
  );
}
