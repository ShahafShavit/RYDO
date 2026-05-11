import { useMemo } from 'react';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';
import RouteMapPreview from './RouteMapPreview';

/**
 * Small Leaflet preview for cards. `preview` matches API preview / routePreview shape ({ coordinates }).
 * Loaded synchronously so the map mounts in the same commit as `geoJson` (lazy+Suspense deferred Leaflet
 * until after paint, so the default world zoom was visible and fitBounds ran too late).
 */
export default function CompactRouteMapPreview({
  preview,
  className = 'h-28 w-full overflow-hidden rounded-2xl border border-border bg-surface',
  /** Card grids: wheel zoom steals page scroll; detail pages use `RouteMapWithElevation` with zoom enabled. */
  scrollWheelZoom = false,
  /** Hide Leaflet +/- on small previews. */
  zoomControl = false,
  /** Smaller OSM credit line (attribution cannot be removed). */
  compactAttribution = true,
}) {
  const geoJson = useMemo(() => buildRoutePreviewFeatureCollection(preview ?? null), [preview]);
  if (!geoJson?.features?.length) {
    return <div className={className} aria-hidden />;
  }
  return (
    <RouteMapPreview
      geoJson={geoJson}
      className={className}
      scrollWheelZoom={scrollWheelZoom}
      zoomControl={zoomControl}
      compactAttribution={compactAttribution}
    />
  );
}
