import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, UsersRound } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import UserAvatar from '@/shared/components/user/UserAvatar';
import TruncatedText from '@/shared/components/ui/TruncatedText';

const PREVIEW_COUNT = 3;

export default function DashboardClubsSection({ groups = [] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? groups : groups.slice(0, PREVIEW_COUNT);
  const hiddenCount = Math.max(0, groups.length - PREVIEW_COUNT);

  return (
    <section className="rydo-panel px-3.5 py-3.5" aria-label="Your clubs">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <Eyebrow>Your clubs · {groups.length}</Eyebrow>
        <Link
          to={ROUTES.routes}
          className="rydo-subtle inline-flex items-center gap-0.5 text-[11px] font-semibold text-rydo-purple no-underline"
        >
          Explore
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-3 py-3">
          <UsersRound className="h-5 w-5 shrink-0 text-fg-subtle" aria-hidden />
          <p className="rydo-subtle text-sm">
            Join a club in{' '}
            <Link to={ROUTES.routes} className="font-semibold text-rydo-purple no-underline">
              Explore
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {visible.map((group) => (
              <Link
                key={group.id}
                to={ROUTES.clubDetails.replace(':clubId', group.id)}
                className="rydo-bold-glass-row flex items-center gap-3 p-2.5 no-underline transition active:opacity-80"
              >
                <UserAvatar
                  avatarUrl={group.avatarUrl}
                  displayName={group.name}
                  sizeClass="h-10 w-10"
                  textClass="text-sm"
                  className="shrink-0 ring-2 ring-border"
                />
                <div className="min-w-0 flex-1">
                  <TruncatedText className="text-sm font-bold text-fg">{group.name}</TruncatedText>
                  <p className="rydo-subtle mt-0.5 truncate text-xs">{group.detail}</p>
                </div>
                <ChevronRight className="h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
              </Link>
            ))}
          </div>
          {!expanded && hiddenCount > 0 ? (
            <button
              type="button"
              className="mt-2.5 w-full rounded-xl border border-border bg-surface-strong/60 py-2 text-sm font-semibold text-fg transition active:opacity-80"
              onClick={() => setExpanded(true)}
            >
              Show more ({hiddenCount})
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
