import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import RouteDetailsHeader from '@/features/routes/components/RouteDetailsHeader';
import RouteMapPreview from '@/features/routes/components/RouteMapPreview';
import RouteMetadataPanel from '@/features/routes/components/RouteMetadataPanel';
import SavedRouteButton from '@/features/routes/components/SavedRouteButton';
import { useRouteDetails } from '@/features/routes/hooks/useRouteDetails';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';

export default function RouteDetailsPage() {
  const { routeId } = useParams();
  const { route } = useRouteDetails(routeId);

  const geoJson = useMemo(
    () => buildRoutePreviewFeatureCollection(route?.preview ?? null),
    [route],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <RouteDetailsHeader route={route} />
        <SavedRouteButton routeId={route?.id} />
      </div>
      <RouteMapPreview geoJson={geoJson} />
      <RouteMetadataPanel route={route} />
    </section>
  );
}
