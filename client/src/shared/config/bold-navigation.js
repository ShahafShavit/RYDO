import { Bike, Compass, Home, MessageCircle, User } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';

/** Primary bottom tabs (mobile Bold). Chat is an action tab, not a route. */
export function getBoldTabItems(userId) {
  const meTo =
    userId != null
      ? ROUTES.userProfile.replace(':userId', String(userId))
      : ROUTES.settings;

  return [
    { key: 'home', label: 'Home', to: ROUTES.dashboard, Icon: Home },
    { key: 'explore', label: 'Explore', to: ROUTES.routes, Icon: Compass },
    { key: 'ride', label: 'Ride', to: ROUTES.myRides, Icon: Bike },
    { key: 'chat', label: 'Chat', type: 'action', Icon: MessageCircle, badge: 'unread' },
    { key: 'me', label: 'Me', to: meTo, Icon: User },
  ];
}

/** Secondary destinations on the Me profile quick-nav (settings is in the profile header). */
export const boldMeOverflowItems = [
  { label: 'My Routes', to: ROUTES.myRoutes },
  { label: 'Clubs', to: ROUTES.clubs },
  { label: 'Leaderboards', to: ROUTES.leaderboards },
  { label: 'Inbox', to: ROUTES.inbox },
];

/** Whether a profile quick-nav chip should show as active for the current path. */
export function isBoldMeNavActive(pathname, to) {
  if (to === ROUTES.myRoutes) {
    return pathname === ROUTES.myRoutes || pathname.startsWith('/your-routes');
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Returns active tab key from current pathname + chat open state. */
export function resolveBoldActiveTab({ pathname, chatOpen, userId }) {
  if (chatOpen) return 'chat';
  if (pathname.startsWith(ROUTES.dashboard)) return 'home';
  if (pathname.startsWith(ROUTES.routes)) return 'explore';
  if (pathname.startsWith(ROUTES.myRides) || pathname.includes('/ride/')) return 'ride';
  if (userId != null && pathname === ROUTES.userProfile.replace(':userId', String(userId))) {
    return 'me';
  }
  if (pathname.startsWith('/users/')) return 'me';
  if (pathname.startsWith(ROUTES.settings)) return 'me';
  return null;
}
