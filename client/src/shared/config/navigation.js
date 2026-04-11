import { ROUTES } from '@/app/router/route-paths';

export const primaryNavigation = [
  { label: 'Overview', href: '#overview' },
  { label: 'Why RYDO', href: '#why-rydo' },
  { label: 'Features', href: '#features' },
  { label: 'Flow', href: '#product-flow' },
  { label: 'Tech', href: '#technology' },
];

export const dashboardNavigation = [
  { label: 'Home', to: ROUTES.dashboard },
  { label: 'Explore Routes', to: ROUTES.routes },
  { label: 'My routes', to: ROUTES.myRoutes },
  { label: 'My rides', to: ROUTES.myRides },
  { label: 'Clubs', to: ROUTES.clubs },
  { label: 'Settings', to: ROUTES.settings },
];

export const adminNavigation = [
  { label: 'Admin', to: ROUTES.admin },
  { label: 'Users', to: ROUTES.adminUsers },
  { label: 'Routes', to: ROUTES.adminRoutes },
];
