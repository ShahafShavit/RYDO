import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminChallengesApi } from '@/features/admin/api/admin-challenges-api';

const TABS = ['instances', 'templates', 'create'];

export default function AdminChallengesPage() {
  const [tab, setTab] = useState('instances');
  const [selectedId, setSelectedId] = useState(null);
  const qc = useQueryClient();

  const instances = useQuery({
    queryKey: ['admin', 'challenges', 'instances'],
    queryFn: () => adminChallengesApi.getInstances({ take: 50 }),
  });
  const templates = useQuery({
    queryKey: ['admin', 'challenges', 'templates'],
    queryFn: () => adminChallengesApi.getTemplates(),
  });
  const progress = useQuery({
    queryKey: ['admin', 'challenges', 'progress', selectedId],
    queryFn: () => adminChallengesApi.getProgress(selectedId, { take: 30 }),
    enabled: selectedId != null,
  });

  const createMutation = useMutation({
    mutationFn: (body) => adminChallengesApi.createInstance(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'challenges'] });
      setTab('instances');
    },
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, body }) => adminChallengesApi.patchInstance(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'challenges'] }),
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    kind: 'quest',
    ruleType: 'Distance',
    targetValue: 400,
    lumpXp: 500,
    bonusPercent: 100,
    startDate: '',
    endDate: '',
    publish: true,
    isFeatured: false,
  });

  const templateItems = templates.data?.items ?? [];
  const instanceItems = instances.data?.items ?? [];

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">Challenges season</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? 'bg-rydo-purple/20 text-fg' : 'bg-surface-strong text-fg-muted'
            }`}
          >
            {t === 'create' ? 'Create new' : t}
          </button>
        ))}
      </div>

      {tab === 'instances' ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-strong text-fg-muted">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Done</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {instanceItems.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">
                      {row.title}
                      {row.isFeatured ? (
                        <span className="ml-2 rounded bg-amber-500/20 px-1.5 text-[10px] uppercase text-amber-200">
                          Featured
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 capitalize">{row.kind}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">{row.completionCount}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-rydo-purple hover:underline"
                        onClick={() => setSelectedId(row.id)}
                      >
                        Progress
                      </button>
                      {row.status === 'Published' ? (
                        <>
                          {' · '}
                          <button
                            type="button"
                            className="text-fg-muted hover:underline"
                            onClick={() => patchMutation.mutate({ id: row.id, body: { endEarly: true } })}
                          >
                            End early
                          </button>
                          {' · '}
                          <button
                            type="button"
                            className="text-fg-muted hover:underline"
                            onClick={() => patchMutation.mutate({ id: row.id, body: { isFeatured: true } })}
                          >
                            Feature
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold">Rider progress</h2>
            {selectedId == null ? (
              <p className="mt-2 text-sm text-fg-muted">Select an instance row.</p>
            ) : progress.isLoading ? (
              <p className="mt-2 text-sm text-fg-muted">Loading…</p>
            ) : (
              <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto text-sm">
                {(progress.data?.items ?? []).map((p) => (
                  <li key={`${p.userId}-${p.handle}`} className="flex justify-between gap-2">
                    <span>{p.displayName || p.handle || `#${p.userId}`}</span>
                    <span className="rydo-tnum text-fg-muted">{p.progressPercent}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'templates' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {templateItems.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border p-4">
              <p className="text-xs uppercase text-fg-subtle">
                {t.kind} · {t.isSystem ? 'system' : 'custom'}
              </p>
              <h3 className="mt-1 font-semibold">{t.title}</h3>
              <p className="mt-2 text-sm text-fg-muted">{t.description}</p>
              {t.kind === 'Base' ? (
                <p className="mt-2 text-sm">XP rewards: {t.defaultXpReward}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'create' ? (
        <form
          className="max-w-lg space-y-4 rounded-2xl border border-border p-6"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              ...form,
              startDate: form.startDate || new Date().toISOString(),
              endDate: form.endDate || new Date(Date.now() + 86400000 * 14).toISOString(),
            });
          }}
        >
          <label className="block text-sm">
            Title
            <input
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm">
            Kind
            <select
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2"
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
            >
              <option value="quest">Quest</option>
              <option value="modifier">Modifier</option>
            </select>
          </label>
          <label className="block text-sm">
            Rule
            <select
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2"
              value={form.ruleType}
              onChange={(e) => setForm((f) => ({ ...f, ruleType: e.target.value }))}
            >
              <option value="Distance">Distance</option>
              <option value="Elevation">Elevation</option>
              <option value="RideCount">Ride count</option>
              <option value="GroupRides">Group rides</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              Target
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2"
                value={form.targetValue}
                onChange={(e) => setForm((f) => ({ ...f, targetValue: Number(e.target.value) }))}
              />
            </label>
            <label className="block text-sm">
              Lump XP
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2"
                value={form.lumpXp}
                onChange={(e) => setForm((f) => ({ ...f, lumpXp: Number(e.target.value) }))}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
            />
            Featured on publish
          </label>
          <button
            type="submit"
            className="rounded-full bg-rydo-purple px-5 py-2.5 text-sm font-semibold text-white"
            disabled={createMutation.isPending}
          >
            Publish instance
          </button>
        </form>
      ) : null}
    </section>
  );
}
