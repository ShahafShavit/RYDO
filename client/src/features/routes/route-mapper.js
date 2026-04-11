import { ESTIMATED_DURATION_SOURCE } from '@/features/routes/utils/durationSource';

function normalizeDifficulty(value) {
  const difficulty = String(value || '').toLowerCase();

  if (difficulty === 'medium') return 'moderate';
  if (difficulty === 'easy') return 'casual';
  if (difficulty === 'casual' || difficulty === 'moderate' || difficulty === 'hard') return difficulty;
  return 'moderate';
}

function normalizeTerrain(value) {
  const terrain = String(value || '').toLowerCase();

  if (terrain === 'rocky' || terrain === 'loam' || terrain === 'clay') return 'trail';
  if (terrain === 'sandy') return 'gravel';
  if (terrain === 'road' || terrain === 'gravel' || terrain === 'trail' || terrain === 'mixed') return terrain;
  return 'mixed';
}

function parseGeoJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeWarnings(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [value];
    } catch {
      return [value];
    }
  }

  return [];
}

export function normalizeRoute(rawRoute = {}) {
  const coordinates = rawRoute.preview?.coordinates || rawRoute.coordinates || null;
  const geoJson = rawRoute.preview?.geoJson || parseGeoJson(rawRoute.geoJsonGeometry);
  const creatorName =
    rawRoute.createdBy?.fullName ||
    rawRoute.createdByName ||
    rawRoute.createdBy ||
    rawRoute.author ||
    'Unknown rider';

  return {
    id: Number(rawRoute.id ?? rawRoute.routeId ?? 0),
    title: rawRoute.title || rawRoute.name || 'Untitled route',
    description: rawRoute.description || '',
    terrain: normalizeTerrain(rawRoute.terrain || rawRoute.soilType || rawRoute.surfaceType),
    difficulty: normalizeDifficulty(rawRoute.difficulty),
    region: rawRoute.region || rawRoute.location || rawRoute.area || null,
    distanceKm: Number(rawRoute.distanceKm || rawRoute.distance || 0),
    elevationGainM: Number(rawRoute.elevationGainM || rawRoute.elevation || 0),
    estimatedDurationMinutes: Number(rawRoute.estimatedDurationMinutes || rawRoute.durationMinutes || rawRoute.duration || 0),
    estimatedDurationSource:
      rawRoute.estimatedDurationSource || rawRoute.durationSource || ESTIMATED_DURATION_SOURCE.UNKNOWN,
    warnings: normalizeWarnings(rawRoute.warnings),
    notes: rawRoute.notes || null,
    gpx: {
      fileUrl: rawRoute.gpx?.fileUrl || rawRoute.gpxFileUrl || null,
      reference: rawRoute.gpx?.reference || rawRoute.gpxReference || null,
    },
    preview: {
      geoJson,
      coordinates,
    },
    createdBy: {
      id: rawRoute.createdBy?.id ?? rawRoute.createdById ?? null,
      fullName: creatorName,
    },
    createdAt: rawRoute.createdAt || null,
    isSaved: Boolean(rawRoute.isSaved),
    status: rawRoute.status || 'published',
  };
}

export function toRouteUploadPayload(formData) {
  return {
    title: formData.title?.trim(),
    description: formData.description?.trim() || '',
    terrain: normalizeTerrain(formData.terrain),
    difficulty: normalizeDifficulty(formData.difficulty),
    estimatedDurationMinutes: Number(formData.estimatedDurationMinutes || 0),
    estimatedDurationSource:
      formData.estimatedDurationSource || ESTIMATED_DURATION_SOURCE.ESTIMATED,
    region: formData.region?.trim() || '',
    warnings: Array.isArray(formData.warnings) ? formData.warnings : [],
  };
}
