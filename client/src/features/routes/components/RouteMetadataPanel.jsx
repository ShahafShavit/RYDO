import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import { ROUTES } from '@/app/router/route-paths';
import { durationSourceLabel } from '@/features/routes/utils/durationSource';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export default function RouteMetadataPanel({ route, showUploadedBy = true }) {
  const { formatKm } = useFormatDistance();
  if (!route) return null;

  const items = [
    ['Distance', route.distanceKm != null ? formatKm(route.distanceKm) : '—'],
    [
      'Estimated time',
      <>
        <span className="block">{formatDuration(route.estimatedDurationMinutes)}</span>
        <span className="mt-1 block text-sm font-normal leading-snug text-white/45">
          {durationSourceLabel(route.estimatedDurationSource)}
        </span>
      </>,
    ],
    ['Difficulty', route.difficulty || '—'],
    ['Terrain', route.terrain || '—'],
    ['Region', route.region || '—'],
    ['Total elevation gain', route.elevationGainM ? `${route.elevationGainM} m` : '—'],
    ['Warnings', route.warnings?.length ? route.warnings.join(', ') : '—'],
  ];

  return (
    <Card>
      <h3 className="text-lg font-semibold">Route metadata</h3>
      {showUploadedBy && route.createdBy?.id != null && route.createdBy?.fullName ? (
        <p className="mt-3 text-sm text-white/52">
          Uploaded by{' '}
          <Link
            to={ROUTES.userProfile.replace(':userId', String(route.createdBy.id))}
            className="font-medium text-[#7B5CFF] hover:underline"
          >
            {route.createdBy.fullName}
          </Link>
        </p>
      ) : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="text-sm text-white/44">{label}</p>
            <div className="mt-2 text-lg font-medium">{value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
