import { normalizeHazard } from '@/features/hazards/hazard-mapper';

export function hazardsFromStatePayload(payload) {
  const list = Array.isArray(payload?.hazards) ? payload.hazards : [];
  const map = new Map();
  for (const raw of list) {
    const h = normalizeHazard(raw);
    if (h.id) map.set(h.id, h);
  }
  return map;
}

export function mergeHazardAdded(prev, raw) {
  const h = normalizeHazard(raw);
  if (!h.id) return prev;
  const next = new Map(prev);
  next.set(h.id, h);
  return next;
}

export function mergeHazardUpdated(prev, payload) {
  const id = Number(payload?.id ?? 0);
  if (!id) return prev;
  const next = new Map(prev);
  const existing = next.get(id);
  if (payload.removed || payload.status === 'hidden' || Number(payload.score) <= 0) {
    next.delete(id);
    return next;
  }
  if (!existing) {
    if (payload.score != null) {
      next.set(id, normalizeHazard({ id, ...payload }));
    }
    return next;
  }
  next.set(id, {
    ...existing,
    score: Number(payload.score ?? existing.score),
    status: payload.status ?? existing.status,
  });
  return next;
}

export function hazardsListFromMap(map) {
  return [...map.values()].sort(
    (a, b) => new Date(b.reportedAt || 0) - new Date(a.reportedAt || 0),
  );
}

export function applyLocalUserVote(prev, hazardId, userVote) {
  const next = new Map(prev);
  const existing = next.get(hazardId);
  if (!existing) return prev;
  next.set(hazardId, {
    ...existing,
    userVote: userVote === 1 || userVote === -1 ? userVote : null,
  });
  return next;
}
