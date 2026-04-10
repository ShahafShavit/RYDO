import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import RouteDetailsHeader from '@/features/routes/components/RouteDetailsHeader';
import RouteMapPreview from '@/features/routes/components/RouteMapPreview';
import RouteMetadataPanel from '@/features/routes/components/RouteMetadataPanel';
import SavedRouteButton from '@/features/routes/components/SavedRouteButton';
import { useRouteDetails } from '@/features/routes/hooks/useRouteDetails';

export default function RouteDetailsPage() {
  const { routeId } = useParams();
  const { route } = useRouteDetails(routeId);

  const geoJson = useMemo(() => {
    if (!route) return null;

    if (route.preview?.geoJson?.type === 'FeatureCollection') {
      return route.preview.geoJson;
    }

    if (route.preview?.geoJson) {
      return {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: route.preview.geoJson }],
      };
    }

    if (Array.isArray(route.preview?.coordinates) && route.preview.coordinates.length > 1) {
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: route.preview.coordinates,
            },
          },
        ],
      };
    }

    return null;
  }, [route]);

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
