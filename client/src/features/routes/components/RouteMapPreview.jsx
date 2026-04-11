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

export default function RouteMapPreview({ geoJson, className }) {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    if (!map.current) {
      map.current = L.map(mapContainer.current).setView([45.5, 10], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map.current);
    }

    // Clear existing layers except tile layer
    map.current.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        map.current.removeLayer(layer);
      }
    });

    // Add new GeoJSON layer
    if (geoJson && geoJson.features && geoJson.features.length > 0) {
      const geoJsonLayer = L.geoJSON(geoJson, {
        style: {
          color: '#7B5CFF',
          weight: 3,
          opacity: 0.8,
        },
      }).addTo(map.current);

      // Fit bounds to feature
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    return () => {
      // Cleanup is handled when component unmounts
    };
  }, [geoJson]);

  return (
    <div
      ref={mapContainer}
      className={
        className ?? 'h-64 rounded-3xl border border-white/10 bg-white/5 overflow-hidden'
      }
    />
  );
}
