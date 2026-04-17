import { lazy, Suspense, useMemo, useState } from 'react';
import ElevationProfileChart from '@/features/routes/components/ElevationProfileChart';
import { buildElevationProfileFromGeoJson } from '@/features/routes/utils/gpxAnalysis';

const RouteMapPreview = lazy(() => import('./RouteMapPreview'));

const mapFallback = (
  <div className="flex h-64 items-center justify-center rounded-3xl border border-border bg-surface text-sm text-fg-subtle">
    Loading map…
  </div>
);

const mapFallbackSplit = (
  <div className="flex h-64 min-h-64 w-full items-center justify-center rounded-3xl border border-border bg-surface text-sm text-fg-subtle md:h-full md:min-h-[280px]">
    Loading map…
  </div>
);

/**
 * Route map plus elevation profile.
 * - If `profile` is set (including `null`), it is used instead of deriving from GeoJSON (e.g. GPX analysis on upload).
 * - If `profile` is omitted, the profile is built from GeoJSON when coordinates include a third (elevation) value.
 * @param {'stack'|'split'} [layout='stack'] — `split`: map and elevation sit side by side from the `md` breakpoint (stacked on small screens).
 * @param {import('react').ReactNode} [splitTrailing] — Optional third column on `md+` when `layout="split"` (e.g. weather beside map and elevation).
 */
export default function RouteMapWithElevation({
  geoJson,
  mapClassName,
  chartClassName = '',
  profile: profileProp,
  scrollWheelZoom = true,
  layout = 'stack',
  splitTrailing = null,
}) {
  const fromGeo = useMemo(() => buildElevationProfileFromGeoJson(geoJson), [geoJson]);
  const profile = profileProp !== undefined ? profileProp : fromGeo;

  const [scrubDistanceM, setScrubDistanceM] = useState(null);
  const profileReady = profile && profile.length >= 2;
  const split = layout === 'split';
  const hasTrailing = Boolean(splitTrailing);

  const splitWithProfile = split && profileReady;
  const splitMapOnlyTrailing = split && hasTrailing && !splitWithProfile;
  const splitThreeCol = splitWithProfile && hasTrailing;

  const defaultMapClass = split
    ? 'h-64 min-h-64 w-full rounded-3xl border border-border bg-surface overflow-hidden md:h-full md:min-h-0'
    : 'h-64 rounded-3xl border border-border bg-surface overflow-hidden';

  const rootClass =
    splitThreeCol
      ? 'flex flex-col gap-3 md:grid md:min-h-[280px] md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_minmax(13rem,280px)] md:items-stretch md:gap-4'
      : splitWithProfile
        ? 'flex flex-col gap-3 md:grid md:min-h-[280px] md:grid-cols-[3fr_2fr] md:items-stretch md:gap-4'
        : splitMapOnlyTrailing
          ? 'flex flex-col gap-3 md:grid md:min-h-[280px] md:grid-cols-[minmax(0,3fr)_minmax(13rem,280px)] md:items-stretch md:gap-4'
          : 'space-y-3';

  const mapWrapClass =
    splitThreeCol || splitWithProfile || splitMapOnlyTrailing ? 'min-h-0 min-w-0' : split ? 'min-w-0' : undefined;

  return (
    <div className={rootClass}>
      <div className={mapWrapClass}>
        <Suspense fallback={split ? mapFallbackSplit : mapFallback}>
          <RouteMapPreview
            geoJson={geoJson}
            className={mapClassName ?? defaultMapClass}
            scrollWheelZoom={scrollWheelZoom}
            scrubDistanceM={profileReady ? scrubDistanceM : null}
          />
        </Suspense>
      </div>
      {profile && profile.length >= 2 ? (
        <ElevationProfileChart
          profile={profile}
          fillHeight={splitWithProfile || splitThreeCol}
          className={`${splitWithProfile || splitThreeCol ? 'min-h-0 min-w-0' : ''} ${chartClassName}`.trim()}
          onScrubChange={setScrubDistanceM}
        />
      ) : null}
      {hasTrailing ? (
        <div
          className={
            splitThreeCol || splitMapOnlyTrailing
              ? 'flex h-full min-h-0 min-w-0 flex-col md:min-h-0'
              : ''
          }
        >
          {splitTrailing}
        </div>
      ) : null}
    </div>
  );
}
