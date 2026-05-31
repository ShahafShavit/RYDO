import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import Button from '@/shared/components/ui/button/Button';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel, modalControlClass, modalSectionTitleClass } from '@/shared/components/ui/modal/ModalPrimitives';
import Input from '@/shared/components/ui/input/Input';
import FormField from '@/shared/components/ui/form-field/FormField';
import ClubAvatarEditor from '@/shared/components/media/ClubAvatarEditor';
import { helpTooltip } from '@/shared/content/help-tooltips';
import {
  clubDefaultSeedFromName,
  isClubUploadedAvatarUrl,
  resolveClubAvatarSeed,
} from '@/shared/lib/avatar-url';

function formFromClub(club) {
  const policy = club?.rideCreationPolicy;
  const name = club?.name ?? '';
  return {
    name,
    description: club?.description ?? '',
    region: club?.region ?? '',
    visibility: club?.visibility === 'private' ? 'private' : 'public',
    rideCreationPolicy:
      policy === 'organizersAndAdmins' || policy === 'adminsOnly' ? policy : 'everyone',
    avatarSeed: club?.avatarSeed ?? resolveClubAvatarSeed(null, name, club?.id),
    avatarUrl: club?.avatarUrl ?? '',
  };
}

const RIDE_CREATION_POLICY_VALUES = {
  everyone: 0,
  organizersAndAdmins: 1,
  adminsOnly: 2,
};

export default function ClubSettingsModal({
  isOpen,
  onClose,
  clubId,
  club,
  inviteMut,
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => formFromClub(club));
  const [baseline, setBaseline] = useState(() => formFromClub(club));

  const formSnapshotKey =
    isOpen && club
      ? [
          club.id,
          club.name,
          club.description,
          club.region,
          club.visibility,
          club.rideCreationPolicy ?? 'everyone',
          club.avatarSeed ?? '',
          club.avatarUrl ?? '',
        ].join('\x1f')
      : '';
  const [appliedFormSnapshotKey, setAppliedFormSnapshotKey] = useState(formSnapshotKey);
  if (formSnapshotKey !== appliedFormSnapshotKey) {
    setAppliedFormSnapshotKey(formSnapshotKey);
    if (isOpen && club) {
      const next = formFromClub(club);
      setForm(next);
      setBaseline(next);
    }
  }

  const patchMut = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        region: form.region.trim() === '' ? '' : form.region.trim(),
        visibility: form.visibility === 'private' ? 1 : 0,
        rideCreationPolicy: RIDE_CREATION_POLICY_VALUES[form.rideCreationPolicy] ?? 0,
      };
      const seedTrimmed = form.avatarSeed.trim();
      const initialSeed = (baseline.avatarSeed ?? '').trim();
      const hadUpload = isClubUploadedAvatarUrl(baseline.avatarUrl);
      const hasUpload = isClubUploadedAvatarUrl(form.avatarUrl);
      if (seedTrimmed !== initialSeed || (hadUpload && !hasUpload)) {
        payload.avatarSeed = seedTrimmed || clubDefaultSeedFromName(form.name.trim());
      }
      return clubsApi.patch(clubId, payload);
    },
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
            <ClubAvatarEditor
              clubId={clubId}
              clubName={form.name?.trim() || club?.name || 'Club'}
              avatarSeed={form.avatarSeed ?? ''}
              avatarUrl={form.avatarUrl ?? ''}
              onAvatarSeedChange={(v) => setForm((f) => ({ ...f, avatarSeed: v }))}
              onUploaded={(path) => setForm((f) => ({ ...f, avatarUrl: path }))}
              onUseGenerated={() => setForm((f) => ({ ...f, avatarUrl: '' }))}
            />
          </FormField>
          <FormField label="Visibility" hint={helpTooltip('clubVisibility')}>
            <select
              className={modalControlClass}
              value={form.visibility}
              onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}
            >
              <option value="public">Public — anyone can join</option>
              <option value="private">Private — approval or invite</option>
            </select>
          </FormField>
          <FormField label="Who can schedule rides" hint={helpTooltip('clubRidePolicy')}>
            <select
              className={modalControlClass}
              value={form.rideCreationPolicy}
              onChange={(e) => setForm((f) => ({ ...f, rideCreationPolicy: e.target.value }))}
            >
              <option value="everyone">Everyone — any active member</option>
              <option value="organizersAndAdmins">Organizers and admins — selected members you designate</option>
              <option value="adminsOnly">Admins only</option>
            </select>
            {form.rideCreationPolicy === 'organizersAndAdmins' ? (
              <p className="mt-2 text-sm text-fg-muted">
                Use the member menu (⋮) on the roster to make someone a ride organizer.
              </p>
            ) : null}
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
