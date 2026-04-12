import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import Input from '@/shared/components/ui/input/Input';
import FormField from '@/shared/components/ui/form-field/FormField';

function formFromClub(club) {
  return {
    name: club?.name ?? '',
    description: club?.description ?? '',
    region: club?.region ?? '',
    visibility: club?.visibility === 'private' ? 'private' : 'public',
  };
}

export default function ClubSettingsModal({
  isOpen,
  onClose,
  clubId,
  club,
  inviteMut,
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => formFromClub(club));

  useEffect(() => {
    if (!isOpen || !club) return;
    setForm(formFromClub(club));
  }, [isOpen, club]);

  const patchMut = useMutation({
    mutationFn: () =>
      clubsApi.patch(clubId, {
        name: form.name.trim(),
        description: form.description.trim(),
        region: form.region.trim() === '' ? '' : form.region.trim(),
        visibility: form.visibility === 'private' ? 1 : 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', 'detail', clubId] });
      queryClient.invalidateQueries({ queryKey: ['clubs', 'list'] });
    },
  });

  return (
    <AnimatedModal open={isOpen} onClose={onClose} maxWidthClassName="max-w-lg" contentClassName="p-4 sm:p-6">
      <Card className="max-h-[min(90vh,720px)] w-full overflow-y-auto p-6" role="dialog" aria-modal="true" aria-labelledby="club-settings-title">
        <div className="flex items-start justify-between gap-4">
          <h2 id="club-settings-title" className="text-xl font-semibold">
            Club settings
          </h2>
          <button type="button" className="shrink-0 text-fg-muted transition hover:text-fg" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form
          className="mt-6 space-y-4 border-b border-border pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            patchMut.mutate();
          }}
        >
          <p className="text-sm font-semibold text-fg/90">Details</p>
          <FormField label="Club name">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Club name"
              required
            />
          </FormField>
          <FormField label="Description">
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What this club is about"
            />
          </FormField>
          <FormField label="Region (optional)">
            <Input
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              placeholder="City or area"
            />
          </FormField>
          <FormField label="Visibility">
            <select
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-fg transition-colors focus:border-rydo-purple/60 focus:outline-none focus:ring-2 focus:ring-rydo-purple/25"
              value={form.visibility}
              onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}
            >
              <option value="public">Public — anyone can join</option>
              <option value="private">Private — approval or invite</option>
            </select>
          </FormField>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="neon" disabled={patchMut.isPending || !form.name.trim()}>
              {patchMut.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            {patchMut.isError ? <span className="self-center text-sm text-red-400">Could not save.</span> : null}
          </div>
        </form>

        <div className="mt-6 border-b border-border pb-6">
          <p className="text-sm font-semibold text-fg/90">Invites</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="secondary" type="button" onClick={() => inviteMut.mutate()} disabled={inviteMut.isPending}>
              {inviteMut.isPending ? 'Creating…' : 'Create invite code'}
            </Button>
            {inviteMut.data?.inviteCode ? (
              <p className="text-sm text-fg-muted">
                Code: <span className="font-mono text-fg">{inviteMut.data.inviteCode}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" type="button" onClick={onClose}>
            Done
          </Button>
        </div>
      </Card>
    </AnimatedModal>
  );
}
