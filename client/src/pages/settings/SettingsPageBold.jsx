import { ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import BoldScrollArea from '@/shared/components/bold/BoldScrollArea';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import IconButton from '@/shared/components/bold/IconButton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import SettingsTabContent from '@/pages/settings/SettingsTabContent';
import SettingsLogoutButton from '@/pages/settings/SettingsLogoutButton';
import { AdminModeSettingsRow } from '@/features/admin/components/AdminModeNavLink';

const TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'password', label: 'Password' },
];

export default function SettingsPageBold({ activeTab, onTabChange }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <BoldScreen>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-5 pb-1 pt-1">
          <IconButton icon={ArrowLeft} aria-label="Back" onClick={() => navigate(-1)} />
          <div className="min-w-0 flex-1">
            <Eyebrow className="mb-1 block">Account</Eyebrow>
            <DisplayTitle as="div" size="sm">
              Settings
            </DisplayTitle>
          </div>
        </header>

        <div className="px-5 pt-3">
          <nav className="flex gap-2" aria-label="Settings sections">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={cn('rydo-chip', activeTab === tab.value && 'rydo-chip-on')}
                aria-current={activeTab === tab.value ? 'page' : undefined}
                onClick={() => onTabChange(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <BoldScrollArea className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-4">
          <SettingsTabContent activeTab={activeTab} variant="bold" />

          <AdminModeSettingsRow variant="bold" />

          <div className="mt-auto border-t border-border pt-4">
            <SettingsLogoutButton
              onClick={logout}
              className="rydo-chip h-12 w-full justify-center gap-2 text-[13.5px] font-bold text-[#FF5C5C] hover:border-[#FF5C5C]/35 hover:bg-[#FF5C5C]/10"
              icon={LogOut}
            />
          </div>
        </BoldScrollArea>
      </div>
    </BoldScreen>
  );
}
