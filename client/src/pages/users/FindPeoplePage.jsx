import { useEffect, useState } from 'react';
import { Link, generatePath } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import { useUserSearch } from '@/features/users/hooks/useUserSearch';
import Card from '@/shared/components/ui/card/Card';
import UserAvatar from '@/shared/components/user/UserAvatar';

export default function FindPeoplePage() {
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(input.trim()), 320);
    return () => window.clearTimeout(t);
  }, [input]);

  const { data: items = [], isFetching, isError, error } = useUserSearch(debounced, 24);

  return (
    <section className="space-y-6 max-w-xl">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-white/42">Community</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Find people</h1>
        <p className="mt-2 max-w-md text-sm text-white/56">
          Search by first name, last name, or email. Results are limited to signed-in members you can open in their
          profile.
        </p>
      </div>

      <Card className="p-4 sm:p-6 bg-white/5 border-white/10">
        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-white/45" aria-hidden />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type at least 2 characters…"
            className="min-w-0 flex-1 bg-transparent text-white placeholder:text-white/35 focus:outline-none"
            autoComplete="off"
          />
        </label>
      </Card>

      {debounced.length > 0 && debounced.length < 2 ? (
        <p className="text-sm text-white/48">Enter at least two characters to search.</p>
      ) : null}

      {debounced.length >= 2 && isFetching ? <p className="text-sm text-white/56">Searching…</p> : null}

      {isError ? (
        <p className="text-sm text-red-400/90">{error?.message || 'Search failed.'}</p>
      ) : null}

      {debounced.length >= 2 && !isFetching && !isError ? (
        <ul className="space-y-2">
          {items.length === 0 ? (
            <li className="text-sm text-white/48">No members match that search.</li>
          ) : (
            items.map((row) => (
              <li key={row.id}>
                <Link
                  to={generatePath(ROUTES.userProfile, { userId: String(row.id) })}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/18 hover:bg-white/[0.07]"
                >
                  <UserAvatar avatarUrl={row.avatarUrl} displayName={row.fullName} />
                  <span className="font-medium text-white/90">{row.fullName || `User ${row.id}`}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </section>
  );
}
