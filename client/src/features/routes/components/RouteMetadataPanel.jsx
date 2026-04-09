import Card from '@/shared/components/ui/card/Card';

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export default function RouteMetadataPanel({ route }) {
  if (!route) return null;

  const items = [
    ['Distance', route.distanceKm ? `${route.distanceKm} km` : '—'],
    ['Estimated time', formatDuration(route.durationMinutes)],
    ['Difficulty', route.difficulty || '—'],
    ['Terrain', route.terrain || '—'],
  ];

  return (
    <Card>
      <h3 className="text-lg font-semibold">Route metadata</h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="text-sm text-white/44">{label}</p>
            <p className="mt-2 text-lg font-medium">{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
