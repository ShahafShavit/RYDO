import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import RouteHazardCountBadge from '@/features/hazards/components/RouteHazardCountBadge';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import { formatTrailMetaLabel } from '@/features/routes/utils/route-formatters';

export default function LinkedRouteRow({ route, routePath, className = '' }) {
  if (!routePath) return null;

  const metaParts = [];
  if (route?.terrain) metaParts.push(formatTrailMetaLabel(route.terrain));
  if (route?.difficulty) metaParts.push(formatTrailMetaLabel(route.difficulty));
  if (route?.region) metaParts.push(route.region);
  const metaLine = metaParts.join(' · ');

  return (
    <Link
      to={routePath}
      className={`rydo-bold-glass-row flex items-center gap-3 p-3 no-underline transition hover:border-border-strong ${className}`.trim()}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <Eyebrow className="text-[10px]">Linked route</Eyebrow>
        <DisplayTitle
          as="div"
          size="sm"
          truncate
          title={route?.title || 'Route'}
          className="mt-1 text-base"
        >
          {route?.title || 'Route'}
        </DisplayTitle>
        {metaLine ? <p className="rydo-subtle mt-0.5 text-xs">{metaLine}</p> : null}
      </div>
      {route ? <RouteHazardCountBadge count={route.hazardCount ?? 0} /> : null}
      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
    </Link>
  );
}
