import Badge from '@/shared/components/ui/badge/Badge';

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export default function RouteDetailsHeader({ route }) {
  if (!route) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neon">{route.difficulty || 'unknown'}</Badge>
        <Badge>{route.terrain || 'mixed'}</Badge>
        <Badge>{formatDuration(route.estimatedDurationMinutes)}</Badge>
      </div>
      <div>
        <h1 className="text-3xl font-semibold">{route.title || 'Untitled'}</h1>
        <p className="mt-3 max-w-3xl text-white/64">{route.description}</p>
      </div>
    </div>
  );
}
