import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { latLngAtDistanceAlongGeoJson } from '@/features/routes/utils/gpxAnalysis';
import { useThemeCssVar } from '@/shared/hooks/useThemeCssVar';
import { cn } from '@/shared/lib/cn';

/** Linked credit required for OSM tiles; short label for tiny previews. */
const OSM_ATTRIB_FULL =
  '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noreferrer noopener" target="_blank">OpenStreetMap contributors</a>';
const OSM_ATTRIB_COMPACT =
  '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noreferrer noopener" target="_blank" title="OpenStreetMap">OSM</a>';

/** Polyline stroke on OSM tiles: fixed blue so the route stays visible regardless of app theme. */
const ROUTE_LINE_COLOR = '#2563eb';

// Fix missing marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/** @see https://leafletjs.com/reference.html#map-fitbounds */
const FIT_BOUNDS_OPTIONS = {
  padding: [50, 50],
  maxZoom: 17,
  animate: false,
};

function applyRouteView(map, layer, { animate = false } = {}) {
  if (!map || !layer) return null;
  map.invalidateSize(false);
  const b = layer.getBounds();
  if (!b.isValid()) return null;
  const padding = L.point(FIT_BOUNDS_OPTIONS.padding[0], FIT_BOUNDS_OPTIONS.padding[1]);
  const targetZoom = Math.min(
    FIT_BOUNDS_OPTIONS.maxZoom ?? 17,
    map.getBoundsZoom(b, false, padding),
  );
  map.setView(b.getCenter(), targetZoom, { animate });
  return { center: b.getCenter(), zoom: targetZoom };
}

/** Canonical fitted view for the route layer (used to detect drift from home). */
function computeRouteHomeView(map, layer) {
  if (!map || !layer) return null;
  const b = layer.getBounds();
  if (!b.isValid()) return null;
  const padding = L.point(FIT_BOUNDS_OPTIONS.padding[0], FIT_BOUNDS_OPTIONS.padding[1]);
  const zoom = Math.min(
    FIT_BOUNDS_OPTIONS.maxZoom ?? 17,
    map.getBoundsZoom(b, false, padding),
  );
  return { center: b.getCenter(), zoom };
}

/** True when the map view matches the fitted route view (within tolerance). */
function isAtHomeView(map, home) {
  if (!map || !home) return true;
  const center = map.getCenter();
  const zoom = map.getZoom();
  return (
    center.distanceTo(home.center) < 80 &&
    Math.abs(zoom - home.zoom) < 0.5
  );
}

export default function RouteMapPreview({
  geoJson,
  className,
  scrollWheelZoom = true,
  scrubDistanceM = null,
  /** Leaflet +/- control; off for small card previews. */
  zoomControl = true,
  /** Smaller bar, no "Leaflet |" prefix, shorter OSM link (still required attribution). */
  compactAttribution = false,
  /** Pan, pinch, and double-click zoom. Off for list thumbnails and scroll-embedded preview mode. */
  mapInteractionEnabled = true,
  /** Pass touches through to parent (e.g. card Link). Used with mapInteractionEnabled=false on thumbnails. */
  pointerEventsNone = false,
}) {
  const markerStroke = useThemeCssVar('--rydo-green', '#3ecfb9');
  const markerFill = useThemeCssVar('--rydo-bg-deep', '#0a0908');

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const scrubMarkerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const homeViewRef = useRef(null);
  /** Bumps when a new L.Map instance exists (incl. React Strict Mode remount) so GeoJSON re-syncs. */
  const [mapEpoch, setMapEpoch] = useState(0);
  const [needsRecenter, setNeedsRecenter] = useState(false);

  const syncHomeView = useCallback((map) => {
    const layer = geoJsonLayerRef.current;
    if (!map || !layer) return;
    homeViewRef.current = computeRouteHomeView(map, layer);
    setNeedsRecenter(false);
  }, []);

  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    const layer = geoJsonLayerRef.current;
    if (!map || !layer) return;
    const home = computeRouteHomeView(map, layer);
    if (!home) return;
    homeViewRef.current = home;
    setNeedsRecenter(false);
    applyRouteView(map, layer, { animate: true });
  }, []);

  useLayoutEffect(() => {
    const el = mapContainerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      scrollWheelZoom,
      zoomControl,
      dragging: mapInteractionEnabled,
      touchZoom: mapInteractionEnabled,
      doubleClickZoom: mapInteractionEnabled,
    }).setView([45.5, 10], 6);
    mapRef.current = map;
    if (compactAttribution) {
      map.attributionControl.setPrefix(false);
    }
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: compactAttribution ? OSM_ATTRIB_COMPACT : OSM_ATTRIB_FULL,
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tiles;

    const ro = new ResizeObserver(() => {
      const m = mapRef.current;
      const layer = geoJsonLayerRef.current;
      if (!m || !layer) return;
      applyRouteView(m, layer);
      syncHomeView(m);
    });
    ro.observe(el);
    resizeObserverRef.current = ro;

    queueMicrotask(() => {
      setMapEpoch((n) => n + 1);
    });

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      geoJsonLayerRef.current = null;
      resizeObserverRef.current = null;
    };
  }, [scrollWheelZoom, zoomControl, compactAttribution, mapInteractionEnabled, syncHomeView]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (mapInteractionEnabled) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
    } else {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
    }
  }, [mapInteractionEnabled, mapEpoch]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapInteractionEnabled) return;

    const updateRecenter = () => {
      setNeedsRecenter(!isAtHomeView(map, homeViewRef.current));
    };

    map.on('moveend', updateRecenter);
    map.on('zoomend', updateRecenter);
    return () => {
      map.off('moveend', updateRecenter);
      map.off('zoomend', updateRecenter);
    };
  }, [mapInteractionEnabled, mapEpoch]);

  useLayoutEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        map.removeLayer(layer);
      }
    });
    geoJsonLayerRef.current = null;

    if (!geoJson?.features?.length) return;

    const geoJsonLayer = L.geoJSON(geoJson, {
      style: {
        color: ROUTE_LINE_COLOR,
        weight: 3,
        opacity: 0.9,
      },
    }).addTo(map);

    geoJsonLayerRef.current = geoJsonLayer;
  }, [geoJson, mapEpoch]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = geoJsonLayerRef.current;
    if (!map || !layer) return;

    const bounds = layer.getBounds();
    if (!bounds.isValid()) return;

    const fit = () => {
      applyRouteView(mapRef.current, geoJsonLayerRef.current);
      syncHomeView(mapRef.current);
    };

    let cancelled = false;
    const scheduleFit = () => {
      if (cancelled) return;
      const m = mapRef.current;
      if (!m) return;
      m.whenReady(fit);
    };
    scheduleFit();
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(scheduleFit);
    });
    const tiles = tileLayerRef.current;
    const onLoad = () => {
      if (!cancelled) scheduleFit();
    };
    tiles?.once('load', onLoad);
    const t = window.setTimeout(scheduleFit, 0);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      window.clearTimeout(t);
      tiles?.off('load', onLoad);
    };
  }, [geoJson, mapEpoch, syncHomeView]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (scrubDistanceM == null || !geoJson?.features?.length) {
      return () => {};
    }

    const ll = latLngAtDistanceAlongGeoJson(geoJson, scrubDistanceM);
    if (!ll) {
      return () => {};
    }

    const marker = L.circleMarker([ll.lat, ll.lng], {
      radius: 6,
      color: markerStroke,
      weight: 2,
      fillColor: markerFill,
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);
    scrubMarkerRef.current = marker;

    return () => {
      map.removeLayer(marker);
      if (scrubMarkerRef.current === marker) scrubMarkerRef.current = null;
    };
  }, [geoJson, mapEpoch, scrubDistanceM, markerStroke, markerFill]);

  const defaultClass = 'h-64 rounded-3xl border border-border bg-surface overflow-hidden';
  const hostClass = cn(
    className ?? defaultClass,
    compactAttribution && 'rydo-leaflet-compact-attrib',
    pointerEventsNone && 'pointer-events-none',
  );
  const showRecenter = needsRecenter && mapInteractionEnabled && !pointerEventsNone;

  return (
    <div className={cn('relative', hostClass)}>
      <div ref={mapContainerRef} className="rydo-leaflet-host h-full w-full" />
      {showRecenter ? (
        <button
          type="button"
          className="rydo-map-overlay rydo-leaflet-recenter-btn pointer-events-auto flex h-[30px] w-[30px] items-center justify-center rounded-sm border border-white/20 bg-[#fff] text-[#333] shadow-md"
          aria-label="Center map on route"
          onClick={(e) => {
            e.stopPropagation();
            handleRecenter();
          }}
        >
          <Crosshair className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
