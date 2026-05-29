import { useMemo } from 'react';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';
import CompactRouteMapPlaceholder from '@/features/routes/components/CompactRouteMapPlaceholder';
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
  /** Narrow side thumbnails — smaller placeholder icon/label when preview is missing. */
  compactPlaceholder = false,
}) {
  const geoJson = useMemo(() => buildRoutePreviewFeatureCollection(preview ?? null), [preview]);
  if (!geoJson?.features?.length) {
    return <CompactRouteMapPlaceholder className={className} compact={compactPlaceholder} />;
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
