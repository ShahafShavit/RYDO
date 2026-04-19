import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import Button from '@/shared/components/ui/button/Button';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel, modalControlClass, modalSectionTitleClass } from '@/shared/components/ui/modal/ModalPrimitives';
import Input from '@/shared/components/ui/input/Input';
import FormField from '@/shared/components/ui/form-field/FormField';
import AvatarOrUrlEditor from '@/shared/components/media/AvatarOrUrlEditor';

function formFromClub(club) {
  return {
    name: club?.name ?? '',
    description: club?.description ?? '',
    region: club?.region ?? '',
    visibility: club?.visibility === 'private' ? 'private' : 'public',
    avatarUrl: club?.avatarUrl ?? '',
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

  const formSnapshotKey =
    isOpen && club
      ? [club.id, club.name, club.description, club.region, club.visibility, club.avatarUrl ?? ''].join('\x1f')
      : '';
  const [appliedFormSnapshotKey, setAppliedFormSnapshotKey] = useState(formSnapshotKey);
  if (formSnapshotKey !== appliedFormSnapshotKey) {
    setAppliedFormSnapshotKey(formSnapshotKey);
    if (isOpen && club) setForm(formFromClub(club));
  }

  const patchMut = useMutation({
    mutationFn: () =>
      clubsApi.patch(clubId, {
        name: form.name.trim(),
        description: form.description.trim(),
        region: form.region.trim() === '' ? '' : form.region.trim(),
        visibility: form.visibility === 'private' ? 1 : 0,
        avatarUrl: form.avatarUrl?.trim() ?? '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', 'detail', clubId] });
      queryClient.invalidateQueries({ queryKey: ['clubs', 'list'] });
    },
  });

  return (
    <AnimatedModal open={isOpen} onClose={onClose} maxWidthClassName="max-w-lg">
      <ModalPanel
        className="max-h-[min(90vh,720px)] w-full overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="club-settings-title"
      >
        <ModalHeader title="Club settings" titleId="club-settings-title" onClose={onClose} />

        <form
          className="mt-6 space-y-4 border-b border-border pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            patchMut.mutate();
          }}
        >
          <p className={modalSectionTitleClass}>Details</p>
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
          <FormField label="Club image">
            <AvatarOrUrlEditor
              kind="club"
              clubId={clubId}
              displayName={form.name?.trim() || club?.name || 'Club'}
              avatarUrl={form.avatarUrl ?? ''}
              onAvatarUrlChange={(v) => setForm((f) => ({ ...f, avatarUrl: v }))}
            />
          </FormField>
          <FormField label="Visibility">
            <select
              className={modalControlClass}
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
          <p className={modalSectionTitleClass}>Invites</p>
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
      </ModalPanel>
    </AnimatedModal>
  );
}
