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
  { label: 'Upload Route', to: '?upload=true' },
  { label: 'Your routes', to: ROUTES.yourRoutes },
  { label: 'Settings', to: ROUTES.settings },
];

export const adminNavigation = [
  { label: 'Admin', to: ROUTES.admin },
  { label: 'Users', to: ROUTES.adminUsers },
  { label: 'Routes', to: ROUTES.adminRoutes },
];
