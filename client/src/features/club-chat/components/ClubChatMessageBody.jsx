import { Link, generatePath } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { segmentMessageBody } from '@/features/club-chat/utils/segmentMessageBody';

export default function ClubChatMessageBody({ body, mentions }) {
  const segs = segmentMessageBody(body || '', mentions || []);

  return (
    <p className="whitespace-pre-wrap break-words text-sm text-fg leading-relaxed">
      {segs.map((seg, i) => {
        if (seg.type === 'text') {
          return (
            <span key={i}>{seg.text}</span>
          );
        }
        const k = seg.kind;
        const id = seg.id;
        const label = seg.label || `${k} ${id}`;
        if (k === 'user') {
          return (
            <Link
              key={i}
              to={generatePath(ROUTES.userProfile, { userId: String(id) })}
              className="text-rydo-purple font-medium hover:underline"
            >
              @{label}
            </Link>
          );
        }
        if (k === 'route') {
          return (
            <Link
              key={i}
              to={generatePath(ROUTES.routeDetails, { routeId: String(id) })}
              className="text-rydo-green font-medium hover:underline"
            >
              @{label}
            </Link>
          );
        }
        if (k === 'ride') {
          return (
            <Link
              key={i}
              to={generatePath(ROUTES.rideEvent, { rideId: String(id) })}
              className="text-fg font-medium hover:underline"
            >
              @{label}
            </Link>
          );
        }
        return (
          <span key={i} className="text-fg-muted">
            @{label}
          </span>
        );
      })}
    </p>
  );
}
