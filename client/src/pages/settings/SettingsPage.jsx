import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import { ChangePasswordForm } from '@/features/account/components/ChangePasswordForm';
import { RidingPreferencesForm } from '@/features/account/components/RidingPreferencesForm';
import { UserDataDisplay } from '@/features/account/components/UserDataDisplay';
import { ProfileEditForm } from '@/features/account/components/ProfileEditForm';
import BadgeNav from '@/shared/components/ui/badge-nav/BadgeNav';

const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() =>
    tabFromUrl === 'profile' || tabFromUrl === 'preferences' || tabFromUrl === 'data' || tabFromUrl === 'password'
      ? tabFromUrl
      : 'password'
  );

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'profile' || t === 'preferences' || t === 'data' || t === 'password') {
      setActiveTab(t);
    }
  }, [searchParams]);

  const tabs = [
    { value: 'profile', label: 'Profile' },
    { value: 'password', label: 'Password' },
    { value: 'preferences', label: 'Preferences' },
    { value: 'data', label: 'My Data' },
  ];

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSearchParams(value === 'password' ? {} : { tab: value }, { replace: true });
  };

  return (
    // <div className="p-6 max-w-4xl mx-auto w-full h-full flex flex-col">
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-white/42">Libary</p>
        <h1 className="mt-2 text-3xl font-semibold">Account Settings</h1>
        <p className="mt-3 max-w-2xl text-white/64">Manage your account preferences and security</p>

      </div>


      <div className="flex flex-col flex-1 ">
        <div className="mb-8 flex justify-center sm:justify-start">
          <BadgeNav
            options={tabs}
            value={activeTab}
            onChange={handleTabChange}
            className="max-w-100"
          />
        </div>

        <Card className="flex-1 sm:p-8 ">
          <div className="h-full flex flex-col items-center">
            {activeTab === 'profile' && (
              <div className="w-full flex justify-center rydo-fade-in">
                <ProfileEditForm />
              </div>
            )}

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

            {activeTab === 'data' && (
              <div className="w-full flex justify-center rydo-fade-in">
                <UserDataDisplay />
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
};

export default SettingsPage;
