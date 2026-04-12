/**
 * Warms the Vite chunk cache for authenticated app routes so navigations feel instant
 * and Framer page transitions actually run instead of waiting on the network.
 */
export function prefetchDashboardRoutes() {
  return Promise.all([
    import('@/pages/dashboard/DashboardPage'),
    import('@/pages/routes/RoutesExplorePage'),
    import('@/pages/routes/RouteDetailsPage'),
    import('@/pages/routes/YourRoutesPage'),
    import('@/pages/rides/MyRidesPage'),
    import('@/pages/clubs/ClubsPage'),
    import('@/pages/clubs/ClubDetailPage'),
    import('@/pages/rides/RideEventPage'),
    import('@/pages/settings/SettingsPage'),
    import('@/pages/users/FindPeoplePage'),
  ]).catch(() => {});
}
