import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import RouteDetailsHeader from '@/features/routes/components/RouteDetailsHeader';
import RouteDetailsPageBold from '@/features/routes/components/RouteDetailsPageBold';
import RouteMapWithElevation from '@/features/routes/components/RouteMapWithElevation';
import RouteMetadataPanel from '@/features/routes/components/RouteMetadataPanel';
import { RouteDetailsDescription } from '@/features/routes/components/RouteDescriptionSnippet';
import SavedRouteButton from '@/features/routes/components/SavedRouteButton';
import ScheduleRideFromRouteModal from '@/features/rides/components/ScheduleRideFromRouteModal';
import Button from '@/shared/components/ui/button/Button';
import { useRouteDetails } from '@/features/routes/hooks/useRouteDetails';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';
import RouteWeatherPanel from '@/features/weather/RouteWeatherPanel';
import { usePageBreadcrumbDetail } from '@/shared/context/BreadcrumbContext';

export default function RouteDetailsPage() {
  const { routeId } = useParams();
  const { route, isLoading: routeLoading } = useRouteDetails(routeId);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  usePageBreadcrumbDetail(route?.title);

  const geoJson = useMemo(
    () => buildRoutePreviewFeatureCollection(route?.preview ?? null),
    [route],
  );

  return (
    <>
      <section className="hidden min-w-0 space-y-6 md:block">
        <RouteDetailsHeader route={route}>
          <SavedRouteButton routeId={route?.id} />
          {route?.id ? (
            <Button type="button" variant="neon" onClick={() => setScheduleOpen(true)}>
              Ride!
            </Button>
          ) : null}
        </RouteDetailsHeader>
        <div className="relative z-0">
          <RouteMapWithElevation
            geoJson={geoJson}
            layout="split"
            splitTrailing={
              <RouteWeatherPanel
                key={route?.id ?? 'route-weather'}
                route={route}
                isRouteLoading={routeLoading}
                layout="split"
              />
            }
          />
          <RouteDetailsDescription description={route?.description} />
        </div>
        {route?.id ? (
          <ScheduleRideFromRouteModal
            open={scheduleOpen}
            onClose={() => setScheduleOpen(false)}
            routeId={route.id}
            routeTitle={route.title || ''}
          />
        ) : null}
        <RouteMetadataPanel route={route} showUploadedBy={false} />
      </section>

      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <RouteDetailsPageBold route={route} geoJson={geoJson} isLoading={routeLoading} />
      </div>
    </>
  );
}
