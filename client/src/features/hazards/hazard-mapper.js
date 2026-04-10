function normalizeSeverity(value) {
  const severity = String(value || '').toLowerCase();
  if (severity === 'low' || severity === 'medium' || severity === 'high') return severity;
  return 'medium';
}

export function normalizeHazard(rawHazard = {}) {
  return {
    id: Number(rawHazard.id || 0),
    type: String(rawHazard.type || rawHazard.title || 'other').toLowerCase(),
    severity: normalizeSeverity(rawHazard.severity),
    description: rawHazard.description || rawHazard.notes || '',
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
  };
}
