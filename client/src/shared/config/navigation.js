import {
  Bike,
  Compass,
  Home,
  LayoutDashboard,
  Map,
  Route as RoutePathIcon,
  UserSearch,
  Users,
  UsersRound,
} from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';

export const primaryNavigation = [
  { label: 'Overview', href: '#overview' },
  { label: 'Why RYDO', href: '#why-rydo' },
  { label: 'Features', href: '#features' },
  { label: 'Flow', href: '#product-flow' },
  { label: 'Tech', href: '#technology' },
];

export const dashboardNavigation = [
  { label: 'Home', to: ROUTES.dashboard, Icon: Home },
  { label: 'Explore Routes', to: ROUTES.routes, Icon: Compass },
  { label: 'My Routes', to: ROUTES.myRoutes, Icon: RoutePathIcon },
  { label: 'My Rides', to: ROUTES.myRides, Icon: Bike },
  { label: 'Clubs', to: ROUTES.clubs, Icon: UsersRound },
  { label: 'Find People', to: ROUTES.findPeople, Icon: UserSearch },
];

export const adminNavigation = [
  { label: 'Admin', to: ROUTES.admin, Icon: LayoutDashboard },
  { label: 'Users', to: ROUTES.adminUsers, Icon: Users },
  { label: 'Routes', to: ROUTES.adminRoutes, Icon: Map },
];
