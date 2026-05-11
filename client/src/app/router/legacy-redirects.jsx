import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ROUTES } from './route-paths';

/** Old SPA path `/rides/:rideId` → `/ride/:rideId` */
export function LegacyRideSpaRedirect() {
  const { rideId } = useParams();
  return <Navigate to={ROUTES.rideEvent.replace(':rideId', String(rideId))} replace />;
}

/** Old route library path `/your-routes` → `/my-routes` (preserves query e.g. ?upload=true) */
export function LegacyYourRoutesRedirect() {
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  const to = qs ? `${ROUTES.myRoutes}?${qs}` : ROUTES.myRoutes;
  return <Navigate to={to} replace />;
}
