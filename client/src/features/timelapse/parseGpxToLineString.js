import { lineString } from '@turf/helpers';

/**
 * @param {Element} el trkpt
 * @returns {number} epoch ms or NaN
 */
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

/**
 * LineString from **every** GPX `trkpt` (document order), then `rtept` if needed.
 * Includes parallel `timesMs` for trkpt rows (NaN when missing); rte points use NaN.
 * @param {string} xmlText full GPX file text
 * @returns {{ line: import('geojson').Feature<import('geojson').LineString>; timesMs: number[] } | null}
 */
export function parseGpxTextForTimelapse(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return null;

  /** @type {import('geojson').Position[]} */
  const coords = [];
  /** @type {number[]} */
  const timesMs = [];

  const pushTrkpts = () => {
    const pts = doc.getElementsByTagName('trkpt');
    for (let i = 0; i < pts.length; i++) {
      const el = pts[i];
      const lat = parseFloat(el.getAttribute('lat') ?? '');
      const lon = parseFloat(el.getAttribute('lon') ?? '');
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      coords.push([lon, lat]);
      timesMs.push(parseTrkptTimeMs(el));
    }
  };

  pushTrkpts();

  if (coords.length < 2) {
    const rte = doc.getElementsByTagName('rtept');
    for (let i = 0; i < rte.length; i++) {
      const el = rte[i];
      const lat = parseFloat(el.getAttribute('lat') ?? '');
      const lon = parseFloat(el.getAttribute('lon') ?? '');
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      coords.push([lon, lat]);
      timesMs.push(NaN);
    }
  }

  if (coords.length < 2) return null;

  return {
    line: lineString(coords, { name: 'gpx-track-full' }),
    timesMs,
  };
}

/**
 * Builds a LineString from **every** GPX `trkpt` (document order), then `rtept` if needed.
 * @param {string} xmlText full GPX file text
 * @returns {import('geojson').Feature<import('geojson').LineString> | null}
 */
export function parseGpxTextToLineString(xmlText) {
  const r = parseGpxTextForTimelapse(xmlText);
  return r?.line ?? null;
}
