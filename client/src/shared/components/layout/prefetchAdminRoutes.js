/** Prefetch admin area lazy chunks after layout mounts. */
export function prefetchAdminRoutes() {
  return Promise.all([
    import('@/pages/admin/AdminDashboardPage'),
    import('@/pages/admin/AdminUsersPage'),
    import('@/pages/admin/AdminRoutesPage'),
    import('@/pages/admin/AdminHazardsPage'),
  ]).catch(() => {});
}
