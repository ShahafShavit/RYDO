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
    distanceFromUserKm: (() => {
      const v = rawRoute.distanceFromUserKm;
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    })(),
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
      id:
        rawRoute.createdBy?.id != null
          ? Number(rawRoute.createdBy.id)
          : rawRoute.createdById != null
            ? Number(rawRoute.createdById)
            : null,
      fullName: creatorName,
      avatarUrl: rawRoute.createdBy?.avatarUrl?.trim() || null,
    },
    routeRiders: normalizeRouteRiders(rawRoute.routeRiders),
    favoriteCount: Math.max(0, Number(rawRoute.favoriteCount ?? 0) || 0),
    createdAt: rawRoute.createdAt || null,
    isSaved: Boolean(rawRoute.isSaved),
    status: rawRoute.status || 'published',
  };
}

/** Normalizes `routeRiders` on a route or the body of `GET /routes/:id/rider-roster`. */
export function normalizeRouteRiders(raw) {
  if (!raw || typeof raw !== 'object') {
    return { totalCount: 0, visibleRiders: [] };
  }
  const visible = Array.isArray(raw.visibleRiders) ? raw.visibleRiders : [];
  return {
    totalCount: Number(raw.totalCount ?? visible.length ?? 0) || 0,
    visibleRiders: visible.map((r) => ({
      userId: Number(r.userId ?? r.id ?? 0),
      fullName: String(r.fullName || r.displayName || '').trim() || 'Rider',
      avatarUrl: r.avatarUrl?.trim() || null,
    })),
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
