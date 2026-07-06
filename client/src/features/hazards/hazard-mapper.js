function normalizeSeverity(value) {
  const severity = String(value || '').toLowerCase();
  if (severity === 'low' || severity === 'medium' || severity === 'high') return severity;
  return 'medium';
}

export function normalizeHazard(rawHazard = {}) {
  const userVoteRaw = rawHazard.userVote;
  const userVote =
    userVoteRaw === 1 || userVoteRaw === -1 ? userVoteRaw : userVoteRaw == null ? null : Number(userVoteRaw);

  return {
    id: Number(rawHazard.id || 0),
    routeId: rawHazard.routeId != null ? Number(rawHazard.routeId) : null,
    rideId: rawHazard.rideId != null ? Number(rawHazard.rideId) : null,
    type: String(rawHazard.type || rawHazard.title || 'other').toLowerCase(),
    severity: normalizeSeverity(rawHazard.severity),
    description: rawHazard.description || rawHazard.notes || '',
    score: Number(rawHazard.score ?? 5),
    status: rawHazard.status || 'active',
    location: {
      lat: Number(rawHazard.latitude || rawHazard.location?.lat || 0),
      lng: Number(rawHazard.longitude || rawHazard.location?.lng || 0),
      region: rawHazard.region || rawHazard.location?.region || null,
    },
    reportedAt: rawHazard.reportedAt || rawHazard.createdAt || null,
    reportedBy: {
      id: Number(rawHazard.reportedBy?.id || rawHazard.reportedBy || 0),
      fullName: rawHazard.reportedBy?.fullName || rawHazard.reportedByName || null,
    },
    userVote: userVote === 1 || userVote === -1 ? userVote : null,
    bumped: Boolean(rawHazard.bumped),
  };
}
