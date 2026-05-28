import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import LiveRideBootOverlay, { LiveRideBootModuleFallback } from '@/features/live-ride/components/LiveRideBootOverlay';

/**
 * Thin route shell: paints the boot overlay immediately, then loads the heavy Mapbox page chunk.
 */
export default function LiveRideRoute() {
  const { rideId } = useParams();
  const [Page, setPage] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    import('@/features/live-ride/RideLiveMapPage')
      .then((mod) => {
        if (!cancelled) setPage(() => mod.default);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Could not load live ride viewer.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <LiveRideBootOverlay
        milestones={{
          module: false,
          ride: false,
          permissions: false,
          map: false,
          location: false,
          camera: false,
        }}
        label="Could not load viewer"
        bootBlocked={false}
        needsLocationAction={false}
        needsOrientationAction={false}
        permissionRequestInFlight={false}
        fatalError={loadError}
        backTo={ROUTES.rideEvent.replace(':rideId', String(rideId))}
      />
    );
  }

  if (!Page) {
    return <LiveRideBootModuleFallback />;
  }

  return <Page moduleReady={true} />;
}
