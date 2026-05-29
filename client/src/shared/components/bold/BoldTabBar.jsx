import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useClubChatUi } from '@/features/club-chat/club-chat-ui-context';
import { useClubChatUnread } from '@/features/club-chat/hooks/useClubChatUnread';
import {
  getBoldTabItems,
  resolveBoldActiveTab,
} from '@/shared/config/bold-navigation';
import { cn } from '@/shared/lib/cn';

export default function BoldTabBar({ className }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { chatOpen, closeChat, toggleChat } = useClubChatUi();
  const { totalUnread } = useClubChatUnread();

  const tabs = getBoldTabItems(user?.id);
  const activeKey = resolveBoldActiveTab({
    pathname: location.pathname,
    chatOpen,
    userId: user?.id,
  });

  const handleTabClick = (tab) => {
    if (tab.type === 'action' && tab.key === 'chat') {
      toggleChat();
      return;
    }
    if (chatOpen) closeChat();
    if (tab.to) navigate(tab.to);
  };

  return (
    <nav
      className={cn(
        'rydo-bold-tabbar fixed inset-x-0 bottom-0 z-(--rydo-z-tabbar) md:hidden',
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
                <span className="absolute -top-1.5 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              ) : null}
            </span>
            <span>{tab.label}</span>
          </>
        );

        if (tab.type === 'action') {
          return (
            <button
              key={tab.key}
              type="button"
              className={cn('rydo-bold-tab', isActive && 'rydo-bold-tab-active')}
              aria-current={isActive ? 'page' : undefined}
              aria-label={showBadge ? `${tab.label}, ${totalUnread} unread` : tab.label}
              onClick={() => handleTabClick(tab)}
            >
              {inner}
            </button>
          );
        }

        return (
          <NavLink
            key={tab.key}
            to={tab.to}
            end={tab.key === 'home'}
            className={({ isActive: navActive }) =>
              cn('rydo-bold-tab', (navActive || isActive) && 'rydo-bold-tab-active')
            }
            onClick={() => {
              if (chatOpen) closeChat();
            }}
          >
            {inner}
          </NavLink>
        );
      })}
    </nav>
  );
}
