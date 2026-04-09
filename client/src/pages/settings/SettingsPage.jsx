import { useState } from 'react';
import Card from '@/shared/components/ui/card/Card';
import { ChangePasswordForm } from '@/features/account/components/ChangePasswordForm';
import { RidingPreferencesForm } from '@/features/account/components/RidingPreferencesForm';
import { UserDataDisplay } from '@/features/account/components/UserDataDisplay';
import BadgeNav from '@/shared/components/ui/badge-nav/BadgeNav';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('password');

  const tabs = [
    { value: 'password', label: 'Password' },
    { value: 'preferences', label: 'Preferences' },
    { value: 'data', label: 'My Data' }
  ];

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
            onChange={setActiveTab}
            className="max-w-100"
          />
        </div>

        <Card className="flex-1 sm:p-8 ">
          <div className="h-full flex flex-col items-center">
            {activeTab === 'password' && (
              <div className="w-full flex justify-center animate-in fade-in duration-300">
                <ChangePasswordForm />
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="w-full flex justify-center animate-in fade-in duration-300">
                <RidingPreferencesForm />
              </div>
            )}

            {activeTab === 'data' && (
              <div className="w-full flex justify-center animate-in fade-in duration-300">
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
