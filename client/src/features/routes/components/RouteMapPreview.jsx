import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { latLngAtDistanceAlongGeoJson } from '@/features/routes/utils/gpxAnalysis';
import { hazardTypeLabel } from '@/features/hazards/hazard-constants';
import { buildHazardMarkerHtml, hazardLeafletIconDimensions } from '@/features/hazards/utils/hazardMarkerHtml';
import { buildHazardMarkerLayout } from '@/features/hazards/utils/hazardMarkerLayout';
import { HAZARD_EXIT_MS } from '@/features/hazards/utils/hazard-motion';
import { useThemeCssVar } from '@/shared/hooks/useThemeCssVar';
import { cn } from '@/shared/lib/cn';

/** Linked credit required for OSM tiles; short label for tiny previews. */
const OSM_ATTRIB_FULL =
  '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noreferrer noopener" target="_blank">OpenStreetMap contributors</a>';
const OSM_ATTRIB_COMPACT =
  '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noreferrer noopener" target="_blank" title="OpenStreetMap">OSM</a>';

/** Polyline stroke on OSM tiles: fixed blue so the route stays visible regardless of app theme. */
const ROUTE_LINE_COLOR = '#2563eb';

/** Stable empty list — default `hazards = []` would allocate a new array every render. */
const EMPTY_HAZARDS = [];

function clusterKeysEqual(a, b) {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const key of a) {
    if (!b.has(key)) return false;
  }
  return true;
}

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
  hazards = EMPTY_HAZARDS,
  selectedHazardId = null,
  onHazardSelect,
  focusZoom = 16,
}) {
  const markerStroke = useThemeCssVar('--rydo-green', '#3ecfb9');
  const markerFill = useThemeCssVar('--rydo-bg-deep', '#0a0908');

  const onHazardSelectRef = useRef(onHazardSelect);

  useLayoutEffect(() => {
    onHazardSelectRef.current = onHazardSelect;
  }, [onHazardSelect]);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const scrubMarkerRef = useRef(null);
  const hazardLayerRef = useRef(null);
  const hazardMarkersRef = useRef(new Map());
  const hazardMetaRef = useRef(new Map());
  const hazardExitTimersRef = useRef(new Map());
  const prevHazardIdsRef = useRef(new Set());
  const hazardsInitializedRef = useRef(false);
  const resizeObserverRef = useRef(null);
  const homeViewRef = useRef(null);
  /** Bumps when a new L.Map instance exists (incl. React Strict Mode remount) so GeoJSON re-syncs. */
  const [mapEpoch, setMapEpoch] = useState(0);
  const [needsRecenter, setNeedsRecenter] = useState(false);
  const [expandedClusterKeys, setExpandedClusterKeys] = useState(() => new Set());

  const handleHazardMarkerClickRef = useRef((hazard) => {
    onHazardSelectRef.current?.(hazard);
  });

  const handleHazardMarkerClick = useCallback(
    (hazard) => {
      const layout = buildHazardMarkerLayout(hazards ?? [], { expandedClusterKeys });
      const entry = layout.get(hazard.id);
      if (!entry) {
        onHazardSelectRef.current?.(hazard);
        return;
      }
      if (entry.collapsed && entry.clusterSize > 1) {
        setExpandedClusterKeys((prev) => {
          const next = new Set([entry.clusterKey]);
          return clusterKeysEqual(prev, next) ? prev : next;
        });
        return;
      }
      onHazardSelectRef.current?.(hazard);
    },
    [hazards, expandedClusterKeys],
  );

  useEffect(() => {
    handleHazardMarkerClickRef.current = handleHazardMarkerClick;
  }, [handleHazardMarkerClick]);

  useEffect(() => {
    if (selectedHazardId == null || !hazards?.length) return;
    const layout = buildHazardMarkerLayout(hazards, { expandedClusterKeys: new Set() });
    const entry = layout.get(selectedHazardId);
    if (entry?.clusterSize > 1) {
      queueMicrotask(() => {
        setExpandedClusterKeys((prev) => {
          const next = new Set([entry.clusterKey]);
          return clusterKeysEqual(prev, next) ? prev : next;
        });
      });
    }
  }, [selectedHazardId, hazards]);

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
      for (const timer of hazardExitTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      hazardExitTimersRef.current.clear();
      hazardLayerRef.current = null;
      hazardMarkersRef.current.clear();
      hazardMetaRef.current.clear();
      prevHazardIdsRef.current = new Set();
      hazardsInitializedRef.current = false;
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

    const collapseClusters = () => {
      setExpandedClusterKeys((prev) => (prev.size === 0 ? prev : new Set()));
    };
    map.on('click', collapseClusters);
    return () => {
      map.off('click', collapseClusters);
    };
  }, [mapEpoch]);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    if (!hazardLayerRef.current || !map.hasLayer(hazardLayerRef.current)) {
      hazardLayerRef.current = L.layerGroup().addTo(map);
      hazardMarkersRef.current.clear();
      hazardMetaRef.current.clear();
    }
    const group = hazardLayerRef.current;
    const layout = buildHazardMarkerLayout(hazards ?? [], { expandedClusterKeys });
    const { iconSize, iconAnchor } = hazardLeafletIconDimensions();
    const currentIds = new Set();
    const prevIds = prevHazardIdsRef.current;

    const hazardTooltip = (hazard, entry) => {
      if (entry?.collapsed && entry.clusterSize > 1) {
        return `${entry.clusterSize} hazards here — tap to expand`;
      }
      return `${hazardTypeLabel(hazard.type)} · 👍 ${hazard.score}`;
    };

    const makeIcon = (hazard, options) =>
      L.divIcon({
        className: 'rydo-hazard-div-icon',
        html: buildHazardMarkerHtml(hazard, options),
        iconSize,
        iconAnchor,
      });

    const bindMarkerClick = (marker, hazard) => {
      marker.off('click');
      marker.on('click', (event) => {
        L.DomEvent.stopPropagation(event);
        handleHazardMarkerClickRef.current?.(hazard);
      });
    };

    for (const hazard of hazards ?? []) {
      const lat = hazard.location?.lat;
      const lng = hazard.location?.lng;
      if (lat == null || lng == null) continue;

      const entry = layout.get(hazard.id);
      if (entry?.hidden) {
        const hidden = hazardMarkersRef.current.get(hazard.id);
        if (hidden) {
          group.removeLayer(hidden.marker);
          hazardMarkersRef.current.delete(hazard.id);
          hazardMetaRef.current.delete(hazard.id);
        }
        continue;
      }

      currentIds.add(hazard.id);
      const selected = hazard.id === selectedHazardId;
      const offsetPx = entry?.offsetPx ?? { x: 0, y: 0 };
      const anchorLat = entry?.anchorLat ?? lat;
      const anchorLng = entry?.anchorLng ?? lng;
      const clusterSize = entry?.clusterSize ?? 1;
      const collapsed = entry?.collapsed ?? false;
      const isNew = hazardsInitializedRef.current && !prevIds.has(hazard.id);
      const meta = hazardMetaRef.current.get(hazard.id);
      const scoreChanged = meta != null && meta.score !== hazard.score;
      const offsetChanged =
        meta != null &&
        (meta.offsetPx?.x !== offsetPx.x || meta.offsetPx?.y !== offsetPx.y);

      const existing = hazardMarkersRef.current.get(hazard.id);
      const iconOptions = {
        selected,
        offsetPx,
        entering: isNew,
        pulsing: isNew,
        scorePop: scoreChanged && !isNew,
        clusterSize,
        collapsed,
      };
      const tooltip = hazardTooltip(hazard, entry);

      if (existing) {
        existing.marker.setLatLng([anchorLat, anchorLng]);
        existing.marker.setIcon(makeIcon(hazard, iconOptions));
        existing.marker.setZIndexOffset(selected ? 1000 : 0);
        bindMarkerClick(existing.marker, hazard);
        const existingTooltip = existing.marker.getTooltip();
        if (existingTooltip) {
          existingTooltip.setContent(tooltip);
        } else {
          existing.marker.bindTooltip(tooltip);
        }
      } else {
        const marker = L.marker([anchorLat, anchorLng], {
          icon: makeIcon(hazard, iconOptions),
          zIndexOffset: selected ? 1000 : 0,
        });
        marker.bindTooltip(tooltip);
        bindMarkerClick(marker, hazard);
        group.addLayer(marker);
        hazardMarkersRef.current.set(hazard.id, { marker, hazard });
      }

      hazardMetaRef.current.set(hazard.id, { score: hazard.score, offsetPx });

      if (isNew || offsetChanged) {
        const enterTimer = hazardExitTimersRef.current.get(`enter-${hazard.id}`);
        if (enterTimer) window.clearTimeout(enterTimer);
        const timer = window.setTimeout(() => {
          const entry2 = hazardMarkersRef.current.get(hazard.id);
          if (!entry2) return;
          entry2.marker.setIcon(
            makeIcon(hazard, { selected, offsetPx, scorePop: false, clusterSize, collapsed }),
          );
          hazardExitTimersRef.current.delete(`enter-${hazard.id}`);
        }, 320);
        hazardExitTimersRef.current.set(`enter-${hazard.id}`, timer);
      }

      if (scoreChanged && !isNew) {
        const popTimer = hazardExitTimersRef.current.get(`pop-${hazard.id}`);
        if (popTimer) window.clearTimeout(popTimer);
        const timer = window.setTimeout(() => {
          const entry2 = hazardMarkersRef.current.get(hazard.id);
          if (!entry2) return;
          entry2.marker.setIcon(makeIcon(hazard, { selected, offsetPx, clusterSize, collapsed }));
          hazardExitTimersRef.current.delete(`pop-${hazard.id}`);
        }, 280);
        hazardExitTimersRef.current.set(`pop-${hazard.id}`, timer);
      }
    }

    prevHazardIdsRef.current = currentIds;

    for (const [id, entry] of hazardMarkersRef.current) {
      if (currentIds.has(id)) continue;

      const exitTimer = hazardExitTimersRef.current.get(`exit-${id}`);
      if (exitTimer) continue;

      const { marker, hazard } = entry;
      const meta = hazardMetaRef.current.get(id);
      const offsetPx = meta?.offsetPx ?? { x: 0, y: 0 };
      const selected = id === selectedHazardId;

      marker.setIcon(
        makeIcon(hazard, {
          selected,
          offsetPx,
          exiting: true,
        }),
      );

      const timer = window.setTimeout(() => {
        group.removeLayer(marker);
        hazardMarkersRef.current.delete(id);
        hazardMetaRef.current.delete(id);
        hazardExitTimersRef.current.delete(`exit-${id}`);
      }, HAZARD_EXIT_MS + 20);

      hazardExitTimersRef.current.set(`exit-${id}`, timer);
    }

    if ((hazards ?? []).length === 0) {
      for (const [, entry] of hazardMarkersRef.current) {
        group.removeLayer(entry.marker);
      }
      hazardMarkersRef.current.clear();
      hazardMetaRef.current.clear();
      prevHazardIdsRef.current = new Set();
      hazardsInitializedRef.current = false;
      queueMicrotask(() => {
        setExpandedClusterKeys((prev) => (prev.size === 0 ? prev : new Set()));
      });
    } else {
      hazardsInitializedRef.current = true;
    }

    return undefined;
  }, [hazards, mapEpoch, selectedHazardId, expandedClusterKeys]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedHazardId == null) return;

    const hazard = hazards.find((h) => h.id === selectedHazardId);
    const lat = hazard?.location?.lat;
    const lng = hazard?.location?.lng;
    if (lat == null || lng == null) return;

    const zoom = Math.max(map.getZoom(), focusZoom);
    map.flyTo([lat, lng], zoom, { animate: true });
    queueMicrotask(() => {
      setNeedsRecenter(true);
    });
  }, [selectedHazardId, hazards, mapEpoch, focusZoom]);

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
