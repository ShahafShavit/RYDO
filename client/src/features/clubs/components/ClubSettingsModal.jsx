import { useEffect, useState } from 'react';
import { Link, generatePath } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/app/router/route-paths';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import Input from '@/shared/components/ui/input/Input';
import FormField from '@/shared/components/ui/form-field/FormField';
import UserAvatar from '@/shared/components/user/UserAvatar';

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
  joinRequests,
  inviteMut,
  approveMut,
  rejectMut,
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
          <button type="button" className="shrink-0 text-white/60 transition hover:text-white" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form
          className="mt-6 space-y-4 border-b border-white/10 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            patchMut.mutate();
          }}
        >
          <p className="text-sm font-semibold text-white/88">Details</p>
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
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition-colors focus:border-[#7B5CFF]/60 focus:outline-none focus:ring-2 focus:ring-[#7B5CFF]/25"
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

        <div className="mt-6 border-b border-white/10 pb-6">
          <p className="text-sm font-semibold text-white/88">Invites</p>
          <p className="mt-1 text-sm text-white/48">Generate a code for riders to redeem and join.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="secondary" type="button" onClick={() => inviteMut.mutate()} disabled={inviteMut.isPending}>
              {inviteMut.isPending ? 'Creating…' : 'Create invite code'}
            </Button>
            {inviteMut.data?.inviteCode ? (
              <p className="text-sm text-white/72">
                Code: <span className="font-mono text-white">{inviteMut.data.inviteCode}</span>
              </p>
            ) : null}
          </div>
        </div>

        {Array.isArray(joinRequests) && joinRequests.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-white/88">Pending requests</h3>
            <ul className="mt-3 space-y-2">
              {joinRequests.map((r) => (
                <li key={r.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <Link
                    to={generatePath(ROUTES.userProfile, { userId: String(r.userId) })}
                    className="flex min-w-0 items-center gap-2 text-white/88 hover:text-white"
                  >
                    <UserAvatar avatarUrl={r.avatarUrl} displayName={r.displayName || `User ${r.userId}`} />
                    <span className="truncate">{r.displayName || `User #${r.userId}`}</span>
                  </Link>
                  <div className="flex gap-2">
                    <Button variant="neon" className="!py-1.5 text-xs" type="button" onClick={() => approveMut.mutate(r.userId)}>
                      Approve
                    </Button>
                    <Button variant="secondary" className="!py-1.5 text-xs" type="button" onClick={() => rejectMut.mutate(r.userId)}>
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" type="button" onClick={onClose}>
            Done
          </Button>
        </div>
      </Card>
    </AnimatedModal>
  );
}
