import { Search } from 'lucide-react';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import GradientCTA from '@/shared/components/bold/GradientCTA';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import ClubCardBold from '@/features/clubs/components/ClubCardBold';

export default function ClubsPageBold({
  isLoading,
  clubsCount = 0,
  memberClubs = [],
  otherPublicClubs = [],
  otherPrivateClubs = [],
  otherClubsCount = 0,
  showEmptySearch = false,
  search = '',
  onSearchChange,
  onCreateOpen,
  onInviteOpen,
}) {
  return (
    <BoldScreen>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="px-5 pt-2">
          <Eyebrow>Community · {clubsCount > 0 ? `${clubsCount} clubs` : 'Clubs'}</Eyebrow>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <DisplayTitle size="lg" className="min-w-0 flex-1">
              Cycling clubs
            </DisplayTitle>
            <GradientCTA
              type="button"
              heightClass="h-11"
              className="shrink-0 px-4 text-sm"
              onClick={onCreateOpen}
            >
              Create
            </GradientCTA>
          </div>
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-rydo-purple"
            onClick={onInviteOpen}
          >
            Have an invite code?
          </button>
        </header>

        <div className="px-5 pt-3">
          <div className="flex h-12 items-center gap-2.5 rounded-full border border-border bg-black/25 px-4">
            <Search className="h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search clubs…"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
              autoComplete="off"
              aria-label="Search clubs"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="mx-5 mt-4 h-24 animate-pulse rounded-[28px] bg-surface-strong" />
        ) : clubsCount === 0 ? (
          <p className="rydo-subtle px-5 pt-4 text-sm">No clubs yet.</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4 pt-3.5">
            {showEmptySearch ? (
              <p className="rydo-subtle text-sm">No clubs match &ldquo;{search.trim()}&rdquo;.</p>
            ) : (
              <>
                <section>
                  <Eyebrow className="mb-2.5 ml-0.5">Your clubs · {memberClubs.length}</Eyebrow>
                  {memberClubs.length === 0 ? (
                    <p className="rydo-subtle px-1 text-sm">
                      {search.trim()
                        ? 'No matching clubs in this section.'
                        : 'You are not an active member of any club yet.'}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {memberClubs.map((club) => (
                        <ClubCardBold key={club.id} club={club} />
                      ))}
                    </div>
                  )}
                </section>

                {otherClubsCount > 0 ? (
                  <section>
                    <Eyebrow className="mb-2.5 ml-0.5">Discover · {otherClubsCount}</Eyebrow>
                    {otherPublicClubs.length > 0 ? (
                      <div className="mb-4">
                        <p className="rydo-subtle mb-2 px-1 text-xs font-semibold uppercase tracking-wide">
                          Public — open to join
                        </p>
                        <div className="flex flex-col gap-2.5">
                          {otherPublicClubs.map((club) => (
                            <ClubCardBold key={club.id} club={club} />
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {otherPrivateClubs.length > 0 ? (
                      <div>
                        <p className="rydo-subtle mb-2 px-1 text-xs font-semibold uppercase tracking-wide">
                          Private — invite or approval
                        </p>
                        <div className="flex flex-col gap-2.5">
                          {otherPrivateClubs.map((club) => (
                            <ClubCardBold key={club.id} club={club} />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </BoldScreen>
  );
}
