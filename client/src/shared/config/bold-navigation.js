import { Bike, Compass, Home, MessageCircle, User } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import { myProfilePath, userProfilePath } from '@/shared/lib/user-paths';

/** Primary bottom tabs (mobile Bold). */
export function getBoldTabItems(userHandle) {
  const meTo = myProfilePath(userHandle);

  return [
    { key: 'home', label: 'Home', to: ROUTES.dashboard, Icon: Home },
    { key: 'explore', label: 'Explore', to: ROUTES.routes, Icon: Compass },
    { key: 'ride', label: 'Ride', to: ROUTES.myRides, Icon: Bike },
    { key: 'chat', label: 'Chat', to: ROUTES.chat, Icon: MessageCircle, badge: 'unread' },
    { key: 'me', label: 'Me', to: meTo, Icon: User },
  ];
}

/** Returns active tab key from current pathname. */
export function resolveBoldActiveTab({ pathname, userHandle }) {
  if (pathname.startsWith(ROUTES.chat)) return 'chat';
  if (pathname.startsWith(ROUTES.dashboard)) return 'home';
  if (pathname.startsWith(ROUTES.routes)) return 'explore';
  if (pathname === ROUTES.myRoutes || pathname.startsWith('/your-routes')) return 'explore';
  if (pathname.startsWith(ROUTES.myRides) || pathname.includes('/ride/')) return 'ride';
  if (userHandle && pathname === userProfilePath(userHandle)) {
    return 'me';
  }
  if (pathname.startsWith(ROUTES.settings)) return 'me';
  return null;
}
