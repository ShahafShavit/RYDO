import * as turf from '@turf/turf';
import { defaultTimelapseVisualFromOptions } from './mapPreset.js';
import { buildRecordingSchedule, distanceKmAtPlaybackU } from './recordingSchedule.js';

const mapboxgl = window.mapboxgl;
const token = window.__RYDO_MAPBOX_TOKEN__;
if (!mapboxgl) {
  window.__rydoMapError = 'mapbox-gl failed to load (CDN blocked?)';
} else if (!token) {
  window.__rydoMapError = 'MAPBOX_ACCESS_TOKEN is empty';
}

if (window.__rydoMapError) {
  console.error(window.__rydoMapError);
} else {
  mapboxgl.accessToken = token;
}

/** @type {import('mapbox-gl').Map | null} */
let map;
let lineCoords = [];
let lineFeature;
let totalLengthKm = 0;
/** @type {ReturnType<typeof buildRecordingSchedule>} */
let recordingSchedule = { ok: false };

const opts = defaultTimelapseVisualFromOptions(window.__RYDO_TIMELAPSE_OPTIONS__);

function normalizeBearing(deg) {
  let x = deg % 360;
  if (x < 0) x += 360;
  return x;
}

function applyTerrain(mapInstance, enabled, exaggeration) {
  if (!mapInstance) return;
  try {
    if (!enabled) {
      mapInstance.setTerrain(null);
      return;
    }
    if (!mapInstance.getSource('mapbox-dem')) {
      mapInstance.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
    }
    mapInstance.setTerrain({
      source: 'mapbox-dem',
      exaggeration: Math.min(2, Math.max(0.3, exaggeration)),
    });
  } catch (e) {
    console.warn('terrain', e);
  }
}

function parseTrkptTimeMs(el) {
  const kids = el.children;
  for (let i = 0; i < kids.length; i++) {
    const tag = (kids[i].tagName || kids[i].localName || '').toLowerCase();
    if (tag === 'time') {
      const v = kids[i].textContent?.trim();
      if (!v) return NaN;
      const ms = Date.parse(v);
      return Number.isFinite(ms) ? ms : NaN;
    }
  }
  return NaN;
}

function parseGpxText(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const pts = [];
  const timesMs = [];
  for (const el of doc.getElementsByTagName('trkpt')) {
    const lat = parseFloat(el.getAttribute('lat'));
    const lon = parseFloat(el.getAttribute('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    pts.push([lon, lat]);
    timesMs.push(parseTrkptTimeMs(el));
  }
  if (pts.length < 2) {
    for (const el of doc.getElementsByTagName('rtept')) {
      const lat = parseFloat(el.getAttribute('lat'));
      const lon = parseFloat(el.getAttribute('lon'));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      pts.push([lon, lat]);
      timesMs.push(NaN);
    }
  }
  return { coords: pts, timesMs };
}

function buildLineString(coords) {
  if (coords.length < 2) return null;
  return turf.lineString(coords);
}

function seek(t) {
  if (!map || !lineFeature || totalLengthKm <= 0) return;
  const clamped = Math.min(1, Math.max(0, t));
  const line = lineFeature;
  const useRec = opts.useRecordingVelocity && recordingSchedule.ok;
  const distKm = distanceKmAtPlaybackU(clamped, totalLengthKm, useRec, recordingSchedule);
  const endPt = turf.along(line, distKm, { units: 'kilometers' });
  const startPt = turf.point(lineCoords[0]);
  const lookAheadKm = Math.min(0.05, totalLengthKm * 0.02);
  const along2 = turf.along(line, Math.min(distKm + lookAheadKm, totalLengthKm), { units: 'kilometers' });
  const c = endPt.geometry.coordinates;
  const c2 = along2.geometry.coordinates;
  let brg = turf.bearing(turf.point(c), turf.point(c2));
  if (!Number.isFinite(brg)) brg = 0;
  brg = normalizeBearing(brg + opts.bearingOffsetDeg);

  let trailData;
  if (distKm <= 0) {
    trailData = turf.featureCollection([]);
  } else if (distKm >= totalLengthKm - 1e-9) {
    trailData = turf.featureCollection([turf.lineString(lineCoords)]);
  } else {
    try {
      const sliced = turf.lineSlice(startPt, endPt, line);
      const sc = sliced.geometry?.coordinates;
      trailData =
        sc && sc.length >= 2 ? turf.featureCollection([sliced]) : turf.featureCollection([]);
    } catch {
      trailData = turf.featureCollection([]);
    }
  }

  map.getSource('trail').setData(trailData);
  map.getSource('rider').setData(turf.featureCollection([endPt]));

  map.jumpTo({
    center: c,
    zoom: opts.zoom,
    pitch: opts.pitch,
    bearing: brg,
    essential: true,
  });
}

function failMap(msg) {
  window.__rydoMapError = msg;
  console.error('[timelapse map]', msg);
}

async function init() {
  if (window.__rydoMapError) return;

  try {
    map = new mapboxgl.Map({
      container: 'map',
      style: opts.mapStyle,
      center: [0, 0],
      zoom: 2,
      pitch: opts.pitch,
      bearing: 0,
      attributionControl: false,
    });
    window.mapInstance = map;
  } catch (e) {
    failMap(e instanceof Error ? e.message : String(e));
    return;
  }

  map.on('error', (e) => {
    const msg = e?.error?.message || e?.error?.toString?.() || 'Mapbox map error';
    if (!window.__rydoMapReady) failMap(msg);
  });

  map.on('load', async () => {
    try {
      applyTerrain(map, opts.terrain3d, opts.terrainExaggeration);

      let xmlText;
      try {
        const res = await fetch('/api/gpx');
        if (!res.ok) throw new Error(`gpx fetch failed (${res.status})`);
        xmlText = await res.text();
      } catch (e) {
        console.error(e);
        failMap(e instanceof Error ? e.message : String(e));
        return;
      }

      const parsed = parseGpxText(xmlText);
      lineCoords = parsed.coords;
      if (lineCoords.length < 2) {
        failMap('GPX has fewer than 2 points');
        return;
      }

      lineFeature = buildLineString(lineCoords);
      totalLengthKm = turf.length(lineFeature, { units: 'kilometers' });
      recordingSchedule = buildRecordingSchedule(lineFeature, parsed.timesMs);

      map.addSource('trail', {
        type: 'geojson',
        data: turf.featureCollection([]),
      });
      map.addSource('rider', {
        type: 'geojson',
        data: turf.featureCollection([]),
      });
      const pr = Math.max(4, opts.puckSizePx / 2);
      map.addLayer({
        id: 'trail-line',
        type: 'line',
        source: 'trail',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': opts.lineColor,
          'line-width': opts.lineWidth,
          'line-opacity': opts.lineOpacity,
        },
      });
      map.addLayer({
        id: 'rider-dot',
        type: 'circle',
        source: 'rider',
        paint: {
          'circle-radius': pr,
          'circle-color': opts.puckColor,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      const b = turf.bbox(turf.lineString(lineCoords));
      map.fitBounds(
        [
          [b[0], b[1]],
          [b[2], b[3]],
        ],
        { padding: 80, duration: 0, pitch: opts.pitch }
      );

      await new Promise((r) => {
        map.once('idle', r);
        setTimeout(r, 2500);
      });

      const warmupSteps = [0, 0.25, 0.5, 0.75, 1];
      for (const s of warmupSteps) {
        seek(s);
        await new Promise((r) => {
          map.once('idle', r);
          setTimeout(r, 800);
        });
      }
      seek(0);

      window.__rydoSeek = (tt) => seek(Number(tt));
      window.__rydoMapReady = true;
    } catch (e) {
      failMap(e instanceof Error ? e.message : String(e));
    }
  });
}

// If style never loads (bad token, WebGL), Playwright must not wait forever.
setTimeout(() => {
  if (!window.__rydoMapReady && !window.__rydoMapError) {
    failMap('Map initialization timed out (check MAPBOX_ACCESS_TOKEN and WebGL in container)');
  }
}, 110_000);

init();
