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
    try {
      const parsed = typeof route.geoJsonGeometry === 'string' ? JSON.parse(route.geoJsonGeometry) : route.geoJsonGeometry;
      // Normalize to FeatureCollection
      if (parsed && parsed.type && parsed.type === 'FeatureCollection') return parsed;
      if (parsed) return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: parsed }] };
    } catch (e) {
      return null;
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
