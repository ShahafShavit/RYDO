import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/app/router/route-paths';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import Input from '@/shared/components/ui/input/Input';
import FormField from '@/shared/components/ui/form-field/FormField';

export default function ClubsPage() {
  const queryClient = useQueryClient();
  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs', 'list'],
    queryFn: () => clubsApi.list(),
  });

  const [form, setForm] = useState({ name: '', description: '', region: '', visibility: 'public' });

  const createMutation = useMutation({
    mutationFn: () =>
      clubsApi.create({
        name: form.name,
        description: form.description,
        region: form.region || null,
        visibility: form.visibility === 'private' ? 1 : 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', 'list'] });
      setForm({ name: '', description: '', region: '', visibility: 'public' });
    },
  });

  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-white/42">Clubs</p>
        <h1 className="mt-2 text-3xl font-semibold">Cycling clubs</h1>
        <p className="mt-2 text-sm text-white/64">Public clubs are open to join. Private clubs require approval or an invite.</p>
      </div>

      <Card className="max-w-xl">
        <h2 className="text-xl font-semibold">Create a club</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <FormField label="Name">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Friday Social Roll"
              required
            />
          </FormField>
          <FormField label="Description">
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Who we are and how we ride"
            />
          </FormField>
          <FormField label="Region (optional)">
            <Input
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              placeholder="Tel Aviv"
            />
          </FormField>
          <FormField label="Visibility">
            <select
              className="w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white"
              value={form.visibility}
              onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}
            >
              <option value="public">Public — anyone can join</option>
              <option value="private">Private — approval or invite</option>
            </select>
          </FormField>
          <Button type="submit" variant="neon" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create club'}
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-white/88">All clubs</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {isLoading ? (
            <p className="text-sm text-white/56">Loading…</p>
          ) : (
            clubs.map((c) => (
              <Link key={c.id} to={ROUTES.clubDetails.replace(':clubId', String(c.id))}>
                <Card className="h-full transition hover:border-[#7B5CFF]/35">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-white">{c.name}</h3>
                    <span className="shrink-0 rounded-full border border-white/12 px-2 py-0.5 text-xs capitalize text-white/56">
                      {c.visibility}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-white/64">{c.description}</p>
                  {c.membershipPending ? (
                    <p className="mt-3 text-xs text-amber-300/90">Membership pending approval</p>
                  ) : null}
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
