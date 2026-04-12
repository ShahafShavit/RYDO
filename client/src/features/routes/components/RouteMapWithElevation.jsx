import { lazy, Suspense, useMemo, useState } from 'react';
import ElevationProfileChart from '@/features/routes/components/ElevationProfileChart';
import { buildElevationProfileFromGeoJson } from '@/features/routes/utils/gpxAnalysis';

const RouteMapPreview = lazy(() => import('./RouteMapPreview'));

const mapFallback = (
  <div className="flex h-64 items-center justify-center rounded-3xl border border-border bg-surface text-sm text-fg-subtle">
    Loading map…
  </div>
);

/**
 * Route map plus elevation profile.
 * - If `profile` is set (including `null`), it is used instead of deriving from GeoJSON (e.g. GPX analysis on upload).
 * - If `profile` is omitted, the profile is built from GeoJSON when coordinates include a third (elevation) value.
 */
export default function RouteMapWithElevation({
  geoJson,
  mapClassName,
  chartClassName = '',
  profile: profileProp,
  scrollWheelZoom = true,
}) {
  const fromGeo = useMemo(() => buildElevationProfileFromGeoJson(geoJson), [geoJson]);
  const profile = profileProp !== undefined ? profileProp : fromGeo;

  const [scrubDistanceM, setScrubDistanceM] = useState(null);
  const profileReady = profile && profile.length >= 2;

  return (
    <div className="space-y-3">
      <Suspense fallback={mapFallback}>
        <RouteMapPreview
          geoJson={geoJson}
          className={mapClassName}
          scrollWheelZoom={scrollWheelZoom}
          scrubDistanceM={profileReady ? scrubDistanceM : null}
        />
      </Suspense>
      {profile && profile.length >= 2 ? (
        <ElevationProfileChart
          profile={profile}
          className={chartClassName}
          onScrubChange={setScrubDistanceM}
        />
      ) : null}
    </div>
  );
}
