import {
  Bike,
  Compass,
  Home,
  LayoutDashboard,
  Map,
  Route as RoutePathIcon,
  Users,
  UsersRound,
} from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';

/** Fragment only — AppNavbar builds `/#…` when not already on the home route. */
export const primaryNavigation = [
  { label: 'Overview', href: '#overview' },
  { label: 'Why RYDO', href: '#why-rydo' },
  { label: 'Features', href: '#features' },
  { label: 'Flow', href: '#product-flow' },
  { label: 'Tech', href: '#technology' },
];

export const dashboardNavigation = [
  { label: 'Home', to: ROUTES.dashboard, Icon: Home },
  { label: 'Explore', to: ROUTES.routes, Icon: Compass },
  { label: 'My Routes', to: ROUTES.myRoutes, Icon: RoutePathIcon },
  { label: 'My Rides', to: ROUTES.myRides, Icon: Bike },
  { label: 'Clubs', to: ROUTES.clubs, Icon: UsersRound },
];

export const adminNavigation = [
  { label: 'Admin', to: ROUTES.admin, Icon: LayoutDashboard },
  { label: 'Users', to: ROUTES.adminUsers, Icon: Users },
  { label: 'Routes', to: ROUTES.adminRoutes, Icon: Map },
];
