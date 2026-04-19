import { useId, useState } from 'react';
import { useRoutesList } from '@/features/routes/hooks/useRoutesList';
import { useCreatePersonalRide } from '@/features/rides/hooks/useCreatePersonalRide';
import Button from '@/shared/components/ui/button/Button';
import FormField from '@/shared/components/ui/form-field/FormField';
import Input from '@/shared/components/ui/input/Input';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel, modalControlClass } from '@/shared/components/ui/modal/ModalPrimitives';
import { cn } from '@/shared/lib/cn';

function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreatePersonalRideModal({ open, onClose }) {
  const titleId = useId();
  const { routes, isLoading: routesLoading } = useRoutesList({ take: 80 });
  const createPersonal = useCreatePersonalRide();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [routeId, setRouteId] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [scheduledLocal, setScheduledLocal] = useState(() =>
    toDatetimeLocalValue(new Date(Date.now() + 86400000).toISOString()),
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    let rid = null;
    if (routeId) {
      const n = Number(routeId);
      if (Number.isNaN(n)) return;
      rid = n;
    }
    if (!name.trim()) return;
    const scheduledDate = new Date(scheduledLocal);
    if (Number.isNaN(scheduledDate.getTime())) return;
    createPersonal.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        routeId: rid,
        maxParticipants: Math.max(1, Number(maxParticipants) || 20),
        scheduledDate: scheduledDate.toISOString(),
      },
      {
        onSuccess: () => {
          onClose?.();
          setName('');
          setDescription('');
          setRouteId('');
        },
      },
    );
  };

  return (
    <AnimatedModal open={open} onClose={onClose}>
      <ModalPanel className="max-h-[90vh] w-full overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <ModalHeader title="Ride!" titleId={titleId} onClose={onClose} />

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <FormField label="Name">
            <Input id="pr-name" value={name} onChange={(ev) => setName(ev.target.value)} required />
          </FormField>
          <FormField label="Description">
            <textarea
              id="pr-desc"
              className={cn(modalControlClass, 'min-h-[4.5rem] resize-y')}
              rows={2}
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
            />
          </FormField>
          <FormField label="Route">
            <select
              id="pr-route"
              className={cn(modalControlClass, 'disabled:opacity-50')}
              value={routeId}
              onChange={(ev) => setRouteId(ev.target.value)}
              disabled={routesLoading}
            >
              <option value="">No route yet (optional)</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title || `Route #${r.id}`}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="When">
            <Input
              id="pr-when"
              type="datetime-local"
              value={scheduledLocal}
              onChange={(ev) => setScheduledLocal(ev.target.value)}
              required
            />
          </FormField>
          <FormField label="Max participants">
            <Input
              id="pr-max"
              type="number"
              min={1}
              value={maxParticipants}
              onChange={(ev) => setMaxParticipants(ev.target.value)}
            />
          </FormField>

          {createPersonal.isError ? (
            <p className="text-sm text-red-400">{createPersonal.error?.message || 'Could not create ride.'}</p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={createPersonal.isPending}>
              {createPersonal.isPending ? 'Riding…' : 'Ride!'}
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
