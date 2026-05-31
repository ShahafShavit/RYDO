import { lazy, Suspense, useMemo, useState } from 'react';
import { Map } from 'lucide-react';
import ElevationProfileChart from '@/features/routes/components/ElevationProfileChart';
import { buildElevationProfileFromGeoJson } from '@/features/routes/utils/gpxAnalysis';
import { useCoarsePointer } from '@/shared/hooks/useCoarsePointer';
import { cn } from '@/shared/lib/cn';

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

function MapChartUnlockOverlay({ onUnlock }) {
  return (
    <div className="rydo-map-overlay pointer-events-none inset-0 flex items-center justify-center">
      <button
        type="button"
        className="pointer-events-auto cursor-pointer border-0 bg-transparent p-0"
        aria-label="Tap to explore route map and elevation profile"
        onClick={onUnlock}
      >
        <span className="rydo-bold-glass-row inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-fg shadow-md backdrop-blur-sm">
          <Map className="h-4 w-4 shrink-0 text-rydo-purple" strokeWidth={2} aria-hidden />
          Tap to explore
        </span>
      </button>
    </div>
  );
}

function MapChartDoneControl({ onDone }) {
  return (
    <button
      type="button"
      className="rydo-map-overlay pointer-events-auto right-2 top-2 inline-flex rounded-full border border-border bg-black/55 px-3 py-1.5 text-xs font-semibold text-fg shadow-md backdrop-blur-sm"
      onClick={(e) => {
        e.stopPropagation();
        onDone();
      }}
    >
      Done
    </button>
  );
}

/**
 * Route map plus elevation profile.
 * - If `profile` is set (including `null`), it is used instead of deriving from GeoJSON (e.g. GPX analysis on upload).
 * - If `profile` is omitted, the profile is built from GeoJSON when coordinates include a third (elevation) value.
 * @param {'stack'|'split'} [layout='stack'] — `split`: map and elevation sit side by side from the `md` breakpoint (stacked on small screens).
 * @param {import('react').ReactNode} [splitTrailing] — Optional third column on `md+` when `layout="split"` (e.g. weather beside map and elevation).
 * @param {'default'|'mapHalf'} [splitTriplePreset='default'] — With map + elevation + trailing: `mapHalf` = map 50% width, elevation and trailing each 25% (`md+` only).
 * @param {'auto'|'preview'|'interactive'} [interactionMode='interactive'] — `auto`: preview + tap-to-unlock on coarse pointer; `preview`: always locked; `interactive`: full pan/scrub.
 */
export default function RouteMapWithElevation({
  geoJson,
  mapClassName,
  chartClassName = '',
  profile: profileProp,
  scrollWheelZoom = true,
  mapCompactAttribution = false,
  chartVariant = 'default',
  chartShowHeader = true,
  layout = 'stack',
  splitTrailing = null,
  splitTriplePreset = 'default',
  className = '',
  interactionMode = 'interactive',
}) {
  const fromGeo = useMemo(() => buildElevationProfileFromGeoJson(geoJson), [geoJson]);
  const profile = profileProp !== undefined ? profileProp : fromGeo;

  const isCoarse = useCoarsePointer();
  const [unlocked, setUnlocked] = useState(false);
  const [scrubDistanceM, setScrubDistanceM] = useState(null);

  const profileReady = profile && profile.length >= 2;
  const split = layout === 'split';
  const hasTrailing = Boolean(splitTrailing);
  const needsGate = interactionMode !== 'interactive';

  const locked =
    interactionMode === 'preview' ||
    (interactionMode === 'auto' && isCoarse && !unlocked);
  const mapInteractive = !locked;
  const showUnlockOverlay = needsGate && locked;
  const showDoneControl = needsGate && isCoarse && unlocked;

  const splitWithProfile = split && profileReady;
  const splitMapOnlyTrailing = split && hasTrailing && !splitWithProfile;
  const splitThreeCol = splitWithProfile && hasTrailing;

  const splitThreeColGrid =
    splitTriplePreset === 'mapHalf'
      ? 'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]'
      : 'md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_minmax(13rem,280px)]';

  const defaultMapClass = split
    ? 'h-64 min-h-64 w-full rounded-3xl border border-border bg-surface overflow-hidden md:h-full md:min-h-0'
    : 'h-64 rounded-3xl border border-border bg-surface overflow-hidden';

  const rootClass =
    splitThreeCol
      ? `flex flex-col gap-3 md:grid md:min-h-[280px] ${splitThreeColGrid} md:items-stretch md:gap-4`
      : splitWithProfile
        ? 'flex flex-col gap-3 md:grid md:min-h-[280px] md:grid-cols-[3fr_2fr] md:items-stretch md:gap-4'
        : splitMapOnlyTrailing
          ? 'flex flex-col gap-3 md:grid md:min-h-[280px] md:grid-cols-[minmax(0,3fr)_minmax(13rem,280px)] md:items-stretch md:gap-4'
          : `shrink-0 space-y-3 ${className}`.trim();

  const mapWrapClass =
    splitThreeCol || splitWithProfile || splitMapOnlyTrailing ? 'min-h-0 min-w-0' : split ? 'min-w-0' : undefined;

  const handleDone = () => {
    setUnlocked(false);
    setScrubDistanceM(null);
  };

  const mapNode = (
    <div className={mapWrapClass}>
      <Suspense fallback={split ? mapFallbackSplit : mapFallback}>
        <RouteMapPreview
          geoJson={geoJson}
          className={mapClassName ?? defaultMapClass}
          scrollWheelZoom={scrollWheelZoom}
          compactAttribution={mapCompactAttribution}
          scrubDistanceM={profileReady ? scrubDistanceM : null}
          mapInteractionEnabled={mapInteractive}
        />
      </Suspense>
    </div>
  );

  const chartNode =
    profile && profile.length >= 2 ? (
      <ElevationProfileChart
        profile={profile}
        fillHeight={splitWithProfile || splitThreeCol}
        variant={chartVariant}
        showHeader={chartShowHeader}
        className={`${splitWithProfile || splitThreeCol ? 'min-h-0 min-w-0' : ''} ${chartClassName}`.trim()}
        onScrubChange={setScrubDistanceM}
        interactive={mapInteractive && profileReady}
        interactionLocked={showUnlockOverlay}
      />
    ) : null;

  const gateWrapperClass = cn(
    'relative flex flex-col gap-3',
    splitWithProfile && 'md:col-span-2 md:grid md:min-h-0 md:grid-cols-[3fr_2fr] md:items-stretch md:gap-4',
    splitThreeCol &&
      (splitTriplePreset === 'mapHalf'
        ? 'md:col-span-2 md:grid md:min-h-0 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-stretch md:gap-4'
        : 'md:col-span-2 md:grid md:min-h-0 md:grid-cols-[3fr_2fr] md:items-stretch md:gap-4'),
  );

  const mapChartBlock = needsGate ? (
    <div
      className={
        split && splitMapOnlyTrailing
          ? 'relative flex min-h-0 min-w-0 flex-col gap-3'
          : split
            ? gateWrapperClass
            : cn('relative flex flex-col gap-3', className)
      }
    >
      {mapNode}
      {chartNode}
      {showUnlockOverlay ? <MapChartUnlockOverlay onUnlock={() => setUnlocked(true)} /> : null}
      {showDoneControl ? <MapChartDoneControl onDone={handleDone} /> : null}
    </div>
  ) : (
    <>
      {mapNode}
      {chartNode}
    </>
  );

  if (needsGate && !split) {
    return mapChartBlock;
  }

  return (
    <div className={rootClass}>
      {mapChartBlock}
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
