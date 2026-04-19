import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import Button from '@/shared/components/ui/button/Button';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel, modalControlClass } from '@/shared/components/ui/modal/ModalPrimitives';
import Input from '@/shared/components/ui/input/Input';
import FormField from '@/shared/components/ui/form-field/FormField';

const emptyForm = { name: '', description: '', region: '', visibility: 'public' };

export default function CreateClubModal({ isOpen, onClose, onSuccess }) {
  const titleId = useId();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

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
      setForm(emptyForm);
      onSuccess?.();
      onClose();
    },
  });

  return (
    <AnimatedModal open={isOpen} onClose={onClose}>
      <ModalPanel className="w-full" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <ModalHeader title="Create a club" titleId={titleId} onClose={onClose} />
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
              className={modalControlClass}
              value={form.visibility}
              onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}
            >
              <option value="public">Public — anyone can join</option>
              <option value="private">Private — approval or invite</option>
            </select>
          </FormField>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="neon" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create club'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </ModalPanel>
    </AnimatedModal>
  );
}
