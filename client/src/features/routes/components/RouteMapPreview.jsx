import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix missing marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/** @see https://leafletjs.com/reference.html#map-fitbounds — FitBounds options (padding, maxZoom; inherits Zoom/Pan options). */
const FIT_BOUNDS_OPTIONS = {
  padding: [50, 50],
  maxZoom: 17,
  animate: false,
};

export default function RouteMapPreview({ geoJson, className }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const geoJsonLayerRef = useRef(null);

  // Create one map per mount; destroy on unmount (Leaflet: map.remove()).
  // Avoids reusing a map instance tied to a detached container (e.g. React Strict Mode remounts).
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    const map = L.map(el).setView([45.5, 10], 6);
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // https://leafletjs.com/reference.html#map-invalidatesize — after container size changes
    const ro = new ResizeObserver(() => {
      map.invalidateSize(false);
      const layer = geoJsonLayerRef.current;
      if (!layer) return;
      const b = layer.getBounds();
      if (b.isValid()) {
        map.fitBounds(b, FIT_BOUNDS_OPTIONS);
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      geoJsonLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
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
        color: '#7B5CFF',
        weight: 3,
        opacity: 0.8,
      },
    }).addTo(map);

    geoJsonLayerRef.current = geoJsonLayer;

    const bounds = geoJsonLayer.getBounds();
    if (!bounds.isValid()) return;

    const fitToLayer = () => {
      const m = mapRef.current;
      const layer = geoJsonLayerRef.current;
      if (!m || !layer) return;
      // https://leafletjs.com/reference.html#map-invalidatesize
      m.invalidateSize(false);
      const b = layer.getBounds();
      if (b.isValid()) {
        // https://leafletjs.com/reference.html#map-fitbounds — "maximum zoom level possible" within bounds + options
        m.fitBounds(b, FIT_BOUNDS_OPTIONS);
      }
    };

    // https://leafletjs.com/reference.html#map-whenready — after map init with at least one layer (tiles included)
    map.whenReady(fitToLayer);
    requestAnimationFrame(() => {
      requestAnimationFrame(fitToLayer);
    });

    return () => {
      geoJsonLayerRef.current = null;
    };
  }, [geoJson]);

  return (
    <div
      ref={mapContainerRef}
      className={
        className ?? 'h-64 rounded-3xl border border-white/10 bg-white/5 overflow-hidden'
      }
    />
  );
}
