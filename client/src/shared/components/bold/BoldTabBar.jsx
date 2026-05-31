import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useClubChatUnread } from '@/features/club-chat/hooks/useClubChatUnread';
import {
  getBoldTabItems,
  resolveBoldActiveTab,
} from '@/shared/config/bold-navigation';
import { cn } from '@/shared/lib/cn';

export default function BoldTabBar({ className }) {
  const { user } = useAuth();
  const location = useLocation();
  const { totalUnread } = useClubChatUnread();

  const tabs = getBoldTabItems(user?.handle);
  const activeKey = resolveBoldActiveTab({
    pathname: location.pathname,
    userHandle: user?.handle,
  });

  return (
    <nav
      className={cn(
        'rydo-bold-tabbar fixed inset-x-0 bottom-0 z-(--rydo-z-tabbar) flex md:hidden',
        className,
      )}
      aria-label="Main"
    >
      {tabs.map((tab) => {
        const Icon = tab.Icon;
        const isActive = activeKey === tab.key;
        const isChat = tab.key === 'chat';
        const showBadge = isChat && totalUnread > 0;

        const inner = (
          <>
            <span className="rydo-bold-tab-icon">
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.9} aria-hidden />
              {showBadge ? (
                <span className="rydo-unread-pip" aria-hidden>
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              ) : null}
            </span>
            <span>{tab.label}</span>
          </>
        );

        return (
          <NavLink
            key={tab.key}
            to={tab.to}
            end={tab.key === 'home'}
            className={({ isActive: navActive }) =>
              cn('rydo-bold-tab', (navActive || isActive) && 'rydo-bold-tab-active')
            }
            aria-label={showBadge ? `${tab.label}, ${totalUnread} unread` : tab.label}
          >
            {inner}
          </NavLink>
        );
      })}
    </nav>
  );
}
