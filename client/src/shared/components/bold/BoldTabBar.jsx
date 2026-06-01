import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useClubChatUnread } from '@/features/club-chat/hooks/useClubChatUnread';
import {
  getBoldTabItems,
  resolveBoldActiveTab,
} from '@/shared/config/bold-navigation';
import { RiderMobileAdminBar } from '@/features/admin/components/AdminModeNavLink';
import MobileBottomChrome from '@/shared/components/layout/mobile-chrome/MobileBottomChrome';
import { cn } from '@/shared/lib/cn';

export function BoldTabNav({ className }) {
  const { user } = useAuth();
  const location = useLocation();
  const { totalUnread } = useClubChatUnread();

  const tabs = getBoldTabItems(user?.handle);
  const activeKey = resolveBoldActiveTab({
    pathname: location.pathname,
    userHandle: user?.handle,
  });

  return tabs.map((tab) => {
    const Icon = tab.Icon;
    const isActive = activeKey === tab.key;
    const isChat = tab.key === 'chat';
    const showBadge = isChat && totalUnread > 0;

    return (
      <NavLink
        key={tab.key}
        to={tab.to}
        end={tab.key === 'home'}
        className={({ isActive: navActive }) =>
          cn('rydo-bold-tab', (navActive || isActive) && 'rydo-bold-tab-active', className)
        }
        aria-label={showBadge ? `${tab.label}, ${totalUnread} unread` : tab.label}
      >
        <span className="rydo-bold-tab-icon">
          <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.9} aria-hidden />
          {showBadge ? (
            <span className="rydo-unread-pip" aria-hidden>
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          ) : null}
        </span>
        <span>{tab.label}</span>
      </NavLink>
    );
  });
}

export default function BoldTabBar({ className }) {
  const { isAdmin } = useAuth();

  return (
    <MobileBottomChrome
      className={className}
      ariaLabel="Main"
      modeBar={isAdmin ? <RiderMobileAdminBar /> : null}
      tabs={<BoldTabNav />}
    />
  );
}
