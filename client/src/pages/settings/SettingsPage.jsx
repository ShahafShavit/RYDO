import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import BadgeNav from '@/shared/components/ui/badge-nav/BadgeNav';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import SettingsPageBold from '@/pages/settings/SettingsPageBold';
import SettingsTabContent from '@/pages/settings/SettingsTabContent';
import SettingsLogoutButton from '@/pages/settings/SettingsLogoutButton';
import SettingsDangerZone from '@/pages/settings/SettingsDangerZone';
import { AdminModeSettingsRow } from '@/features/admin/components/AdminModeNavLink';

const MotionDiv = motion.div;

const settingsTabTransition = {
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1],
};

/** Active section is driven only by `?tab=` so URL and UI never fight (single source of truth). */
function settingsTabFromSearchParams(searchParams) {
  const t = searchParams.get('tab');
  if (t === 'password') return 'password';
  if (t === 'profile') return 'profile';
  return 'profile';
}

const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const reducedMotion = useReducedMotion();
  const { logout } = useAuth();

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
    <>
      <section className="hidden space-y-6 md:block">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Account</p>
          <h1 className="mt-2 text-3xl font-semibold">Account Settings</h1>
        </div>

        <div className="flex flex-1 flex-col">
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
              <SettingsTabContent activeTab={activeTab} />
            </MotionDiv>
          </AnimatePresence>

          <div className="mt-10 space-y-4 border-t border-border pt-6">
            <SettingsDangerZone />
            <AdminModeSettingsRow />
            <SettingsLogoutButton
              onClick={logout}
              icon={LogOut}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-[#FF5C5C] transition-colors hover:bg-[#FF5C5C]/12"
            />
          </div>
        </div>
      </section>

      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <SettingsPageBold activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </>
  );
};

export default SettingsPage;
