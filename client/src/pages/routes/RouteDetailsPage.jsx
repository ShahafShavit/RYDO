import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import RouteDetailsHeader from '@/features/routes/components/RouteDetailsHeader';
import RouteMapWithElevation from '@/features/routes/components/RouteMapWithElevation';
import RouteMetadataPanel from '@/features/routes/components/RouteMetadataPanel';
import SavedRouteButton from '@/features/routes/components/SavedRouteButton';
import ScheduleRideFromRouteModal from '@/features/rides/components/ScheduleRideFromRouteModal';
import Button from '@/shared/components/ui/button/Button';
import { useRouteDetails } from '@/features/routes/hooks/useRouteDetails';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';

export default function RouteDetailsPage() {
  const { routeId } = useParams();
  const { route } = useRouteDetails(routeId);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const geoJson = useMemo(
    () => buildRoutePreviewFeatureCollection(route?.preview ?? null),
    [route],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <RouteDetailsHeader route={route} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <SavedRouteButton routeId={route?.id} />
          {route?.id ? (
            <Button type="button" variant="neon" onClick={() => setScheduleOpen(true)}>
              Schedule a ride
            </Button>
          ) : null}
        </div>
      </div>
      <RouteMapWithElevation geoJson={geoJson} />
      {route?.id ? (
        <ScheduleRideFromRouteModal
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          routeId={route.id}
          routeTitle={route.title || ''}
        />
      ) : null}
      <RouteMetadataPanel route={route} />
    </section>
  );
}
