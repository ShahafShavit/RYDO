import { Link, generatePath } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { segmentMessageBody } from '@/features/club-chat/utils/segmentMessageBody';

const mentionClass = {
  user: {
    mine: 'text-[#a78bff] font-semibold hover:underline',
    theirs: 'text-rydo-purple font-semibold hover:underline',
  },
  route: {
    mine: 'text-rydo-green-bright font-semibold hover:underline',
    theirs: 'text-rydo-green-bright font-semibold hover:underline',
  },
  ride: {
    mine: 'text-fg font-semibold hover:underline',
    theirs: 'text-fg font-semibold hover:underline',
  },
};

export default function ClubChatMessageBody({ body, mentions, mine = false }) {
  const segs = segmentMessageBody(body || '', mentions || []);
  const variant = mine ? 'mine' : 'theirs';

  return (
    <p className="m-0 whitespace-pre-wrap break-words text-[13.5px] leading-[1.45] text-fg">
      {segs.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.text}</span>;
        }
        const k = seg.kind;
        const id = seg.id;
        const label = seg.label || `${k} ${id}`;
        const cls = mentionClass[k]?.[variant] ?? 'text-fg-muted font-semibold';
        if (k === 'user') {
          return (
            <Link
              key={i}
              to={generatePath(ROUTES.userProfile, { userId: String(id) })}
              className={cls}
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
              className={cls}
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
              className={cls}
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
