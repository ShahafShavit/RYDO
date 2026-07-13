import { Link } from 'react-router-dom';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { userProfilePath, formatHandleDisplay } from '@/shared/lib/user-paths';
import { cn } from '@/shared/lib/cn';

function PersonRowContent({ row, variant }) {
  const nameClass =
    variant === 'desktop' ? 'block font-medium text-fg/90' : 'block truncate font-semibold text-fg';
  const handleClass =
    variant === 'desktop' ? 'block truncate text-sm text-fg-muted' : 'block truncate text-xs text-fg-muted';
  return (
    <>
      <UserAvatar avatarUrl={row.avatarUrl} displayName={row.fullName} />
      <div className="min-w-0">
        <span className={nameClass}>{row.fullName || `User ${row.id}`}</span>
        {row.handle ? <span className={handleClass}>{formatHandleDisplay(row.handle)}</span> : null}
      </div>
    </>
  );
}

function PeopleList({ variant, peopleItems, isFetching, isError, errorMessage }) {
  const hasItems = peopleItems.length > 0;
  const showList = hasItems || (!isFetching && !isError);
  const subtle = variant === 'mobile' ? 'rydo-subtle text-sm' : 'text-sm text-fg-muted';

  return (
    <>
      {isFetching ? <p className={subtle}>Searching…</p> : null}
      {isError ? (
        <p className="text-sm text-red-400/90">{errorMessage || 'People search failed.'}</p>
      ) : null}
      {showList && !isError ? (
        variant === 'desktop' ? (
          <ul className="space-y-2">
            {!hasItems ? (
              <li className="text-sm text-fg-subtle">No members match that search.</li>
            ) : (
              peopleItems.map((row) => {
                const path = userProfilePath(row.handle);
                return (
                  <li key={row.id}>
                    {path ? (
                      <Link
                        to={path}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-surface-strong px-4 py-3 transition hover:border-border-strong"
                      >
                        <PersonRowContent row={row} variant="desktop" />
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-strong px-4 py-3 opacity-70">
                        <PersonRowContent row={row} variant="desktop" />
                      </div>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        ) : (
          <div className="flex flex-col gap-2">
            {!hasItems ? (
              <p className="rydo-subtle text-sm">No members match that search.</p>
            ) : (
              peopleItems.map((row) => {
                const path = userProfilePath(row.handle);
                const rowClass =
                  'rydo-bold-glass-row flex items-center gap-3 p-3 no-underline transition active:opacity-80';
                return path ? (
                  <Link key={row.id} to={path} className={rowClass}>
                    <PersonRowContent row={row} variant="mobile" />
                  </Link>
                ) : (
                  <div key={row.id} className={cn(rowClass, 'opacity-70')}>
                    <PersonRowContent row={row} variant="mobile" />
                  </div>
                );
              })
            )}
          </div>
        )
      ) : null}
    </>
  );
}

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
          Type at least 2 characters to search members by name or handle.
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
        <PeopleList
          variant="desktop"
          peopleItems={peopleItems}
          isFetching={isFetching}
          isError={isError}
          errorMessage={errorMessage}
        />
      </section>
    );
  }

  return (
    <section className={cn('mb-4', className)} aria-label="People search results">
      <Eyebrow className="mb-2.5">{eyebrow}</Eyebrow>
      <PeopleList
        variant="mobile"
        peopleItems={peopleItems}
        isFetching={isFetching}
        isError={isError}
        errorMessage={errorMessage}
      />
    </section>
  );
}
