import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import { ChangePasswordForm } from '@/features/account/components/ChangePasswordForm';
import { RidingPreferencesForm } from '@/features/account/components/RidingPreferencesForm';
import { ProfileEditForm } from '@/features/account/components/ProfileEditForm';
import BadgeNav from '@/shared/components/ui/badge-nav/BadgeNav';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUserProfile } from '@/features/users/hooks/useUserProfile';
import { UserProfilePublicCard } from '@/features/users/components/UserProfilePublicCard';

function ProfileTabPublicPreview() {
  const { user } = useAuth();
  const userId = user?.id != null ? String(user.id) : '';

  const { data: profile, isLoading, isError } = useUserProfile(userId || undefined);

  if (!user) {
    return <p className="text-center text-white/60 sm:text-left">Sign in to manage your profile.</p>;
  }
  if (!userId) {
    return null;
  }
  if (isLoading) {
    return <p className="text-center text-white/60 sm:text-left">Loading your public profile…</p>;
  }
  if (isError || !profile) {
    return <p className="text-center text-white/60 sm:text-left">Could not load your public profile preview.</p>;
  }

  return (
    <UserProfilePublicCard
      profile={profile}
      userId={userId}
      ownerEmptyHint="You have not shared any public profile details yet. Add a bio or visibility below."
    />
  );
}

const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => {
    if (tabFromUrl === 'data') return 'profile';
    return tabFromUrl === 'profile' || tabFromUrl === 'preferences' || tabFromUrl === 'password'
      ? tabFromUrl
      : 'password';
  });

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'data') {
      setActiveTab('profile');
      setSearchParams({ tab: 'profile' }, { replace: true });
      return;
    }
    if (t === 'profile' || t === 'preferences' || t === 'password') {
      setActiveTab(t);
    }
  }, [searchParams, setSearchParams]);

  const tabs = [
    { value: 'profile', label: 'Profile' },
    { value: 'password', label: 'Password' },
    { value: 'preferences', label: 'Preferences' },
  ];

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSearchParams(value === 'password' ? {} : { tab: value }, { replace: true });
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-white/42">Account</p>
        <h1 className="mt-2 text-3xl font-semibold">Account Settings</h1>
        <p className="mt-3 max-w-2xl text-white/64">Manage your account preferences and security</p>
      </div>

      <div className="flex flex-col flex-1">
        <div className="mb-8 flex justify-center sm:justify-start">
          <BadgeNav options={tabs} value={activeTab} onChange={handleTabChange} className="max-w-100" />
        </div>

        {activeTab === 'profile' ? (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 rydo-fade-in">
            <ProfileTabPublicPreview />
            <div>
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">Edit details</p>
              <Card className="flex-1 sm:p-8">
                <div className="flex flex-col items-center">
                  <ProfileEditForm />
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="flex-1 sm:p-8">
            <div className="flex h-full flex-col items-center">
              {activeTab === 'password' && (
                <div className="w-full flex justify-center rydo-fade-in">
                  <ChangePasswordForm />
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="w-full flex justify-center rydo-fade-in">
                  <RidingPreferencesForm />
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </section>
  );
};

export default SettingsPage;
