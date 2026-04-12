import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Card from '@/shared/components/ui/card/Card';
import { ChangePasswordForm } from '@/features/account/components/ChangePasswordForm';
import { RidingPreferencesForm } from '@/features/account/components/RidingPreferencesForm';
import { ProfileEditForm } from '@/features/account/components/ProfileEditForm';
import BadgeNav from '@/shared/components/ui/badge-nav/BadgeNav';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUserProfile } from '@/features/users/hooks/useUserProfile';
import { UserProfilePublicCard } from '@/features/users/components/UserProfilePublicCard';
import { projectProfileAsSeenByOthers } from '@/features/account/account-mapper';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

const MotionDiv = motion.div;

const settingsTabTransition = {
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1],
};

function ProfileTabPublicPreview() {
  const { user } = useAuth();
  const userId = user?.id != null ? String(user.id) : '';

  const { data: profile, isLoading, isError } = useUserProfile(userId || undefined);

  const cardProfile = useMemo(
    () => (profile ? projectProfileAsSeenByOthers(profile) : null),
    [profile],
  );

  if (!user) {
    return <p className="text-center text-fg-muted sm:text-left">Sign in to manage your profile.</p>;
  }
  if (!userId) {
    return null;
  }
  if (isLoading) {
    return <p className="text-center text-fg-muted sm:text-left">Loading your public profile…</p>;
  }
  if (isError || !profile || !cardProfile) {
    return <p className="text-center text-fg-muted sm:text-left">Could not load your public profile preview.</p>;
  }

  return (
    <UserProfilePublicCard
      profile={cardProfile}
      userId={userId}
      ownerEmptyHint="You have not shared any public profile details yet. Turn on visibility under Edit details, and choose what to show in Preferences below."
    />
  );
}

/** Active section is driven only by `?tab=` so URL and UI never fight (single source of truth). */
function settingsTabFromSearchParams(searchParams) {
  const t = searchParams.get('tab');
  if (t === 'password') return 'password';
  if (t === 'profile') return 'profile';
  // No tab or unknown value → Profile (same as /settings with no query)
  return 'profile';
}

const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const reducedMotion = useReducedMotion();

  const activeTab = useMemo(() => settingsTabFromSearchParams(searchParams), [searchParams]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'data' || t === 'preferences') {
      setSearchParams({ tab: 'profile' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const tabs = [
    { value: 'profile', label: 'Profile' },
    { value: 'password', label: 'Password' },
  ];

  const handleTabChange = (value) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Account</p>
        <h1 className="mt-2 text-3xl font-semibold">Account Settings</h1>
      </div>

      <div className="flex flex-col flex-1">
        <div className="mb-8 flex justify-center sm:justify-start">
          <BadgeNav options={tabs} value={activeTab} onChange={handleTabChange} className="max-w-100" />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <MotionDiv
            key={activeTab}
            className="w-full"
            initial={
              reducedMotion
                ? { opacity: 1, y: 0 }
                : {
                    opacity: 0.88,
                    y: 6,
                  }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              reducedMotion
                ? { opacity: 1, y: 0 }
                : {
                    opacity: 0.88,
                    y: -4,
                  }
            }
            transition={reducedMotion ? { duration: 0 } : settingsTabTransition}
          >
            {activeTab === 'profile' ? (
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
                <div>
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">
                    How others see your profile
                  </p>
                  <ProfileTabPublicPreview />
                </div>
                <div>
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">Edit details</p>
                  <Card className="flex-1 sm:p-8">
                    <div className="flex flex-col items-center">
                      <ProfileEditForm />
                    </div>
                  </Card>
                </div>
                <div>
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">Preferences</p>
                  <Card className="flex-1 sm:p-8">
                    <div className="flex flex-col items-center">
                      <RidingPreferencesForm />
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              <Card className="flex-1 sm:p-8">
                <div className="flex h-full flex-col items-center">
                  <div className="w-full flex justify-center">
                    <ChangePasswordForm />
                  </div>
                </div>
              </Card>
            )}
          </MotionDiv>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default SettingsPage;
