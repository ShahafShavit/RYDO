import { Link, generatePath } from 'react-router-dom';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { ROUTES } from '@/app/router/route-paths';
import { cn } from '@/shared/lib/cn';

export default function ExplorePeopleSection({
  variant = 'mobile',
  searchQuery = '',
  peopleItems = [],
  isFetching = false,
  isError = false,
  errorMessage = '',
  showPrompt = false,
  showKeepTyping = false,
  compact = false,
  className,
}) {
  const q = searchQuery.trim();

  if (showPrompt) {
    return (
      <section className={cn(className)} aria-label="People">
        <Eyebrow className="mb-2.5">People</Eyebrow>
        <p className={variant === 'mobile' ? 'rydo-subtle text-sm' : 'text-sm text-fg-muted'}>
          Type at least 2 characters to search members by name.
        </p>
      </section>
    );
  }

  if (showKeepTyping) {
    return (
      <section className={cn(className)} aria-label="People">
        <Eyebrow className="mb-2.5">People</Eyebrow>
        <p className={variant === 'mobile' ? 'rydo-subtle text-sm' : 'text-sm text-fg-muted'}>
          Keep typing — search starts at 2 characters.
        </p>
      </section>
    );
  }

  if (!q || q.length < 2) return null;

  const eyebrow = compact ? `People · ${peopleItems.length}` : 'People';

  if (variant === 'desktop') {
    return (
      <section
        className={cn('space-y-3 rounded-[28px] border border-border bg-surface px-4 py-4 sm:px-6', className)}
        aria-label="People search results"
      >
        <h2 className="text-sm font-medium text-fg/90">{compact ? eyebrow : 'People'}</h2>
        {isFetching ? <p className="text-sm text-fg-muted">Searching…</p> : null}
        {isError ? (
          <p className="text-sm text-red-400/90">{errorMessage || 'People search failed.'}</p>
        ) : null}
        {!isFetching && !isError ? (
          <ul className="space-y-2">
            {peopleItems.length === 0 ? (
              <li className="text-sm text-fg-subtle">No members match that search.</li>
            ) : (
              peopleItems.map((row) => (
                <li key={row.id}>
                  <Link
                    to={generatePath(ROUTES.userProfile, { userId: String(row.id) })}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface-strong px-4 py-3 transition hover:border-border-strong"
                  >
                    <UserAvatar avatarUrl={row.avatarUrl} displayName={row.fullName} />
                    <span className="font-medium text-fg/90">{row.fullName || `User ${row.id}`}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </section>
    );
  }

  return (
    <section className={cn('mb-4', className)} aria-label="People search results">
      <Eyebrow className="mb-2.5">{eyebrow}</Eyebrow>
      {isFetching ? <p className="rydo-subtle text-sm">Searching…</p> : null}
      {isError ? (
        <p className="text-sm text-red-400/90">{errorMessage || 'People search failed.'}</p>
      ) : null}
      {!isFetching && !isError ? (
        <div className="flex flex-col gap-2">
          {peopleItems.length === 0 ? (
            <p className="rydo-subtle text-sm">No members match that search.</p>
          ) : (
            peopleItems.map((row) => (
              <Link
                key={row.id}
                to={generatePath(ROUTES.userProfile, { userId: String(row.id) })}
                className="rydo-bold-glass-row flex items-center gap-3 p-3 no-underline transition active:opacity-80"
              >
                <UserAvatar avatarUrl={row.avatarUrl} displayName={row.fullName} />
                <span className="truncate font-semibold text-fg">{row.fullName || `User ${row.id}`}</span>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
