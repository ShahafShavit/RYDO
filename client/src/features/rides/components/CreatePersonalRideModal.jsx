import { useId, useState } from 'react';
import InviteFriendsToRideModal from '@/features/rides/components/InviteFriendsToRideModal';
import { useCreatePersonalRide } from '@/features/rides/hooks/useCreatePersonalRide';
import RoutePickerField from '@/features/routes/components/RoutePickerField';
import Button from '@/shared/components/ui/button/Button';
import FormField from '@/shared/components/ui/form-field/FormField';
import Input from '@/shared/components/ui/input/Input';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel, modalControlClass } from '@/shared/components/ui/modal/ModalPrimitives';
import { cn } from '@/shared/lib/cn';
import { MAX_RIDE_NAME_LENGTH } from '@/shared/constants/text-limits';

function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreatePersonalRideModal({ open, onClose }) {
  const titleId = useId();
  const createPersonal = useCreatePersonalRide();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [routeId, setRouteId] = useState(null);
  const [routeDisplay, setRouteDisplay] = useState(null);
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [scheduledLocal, setScheduledLocal] = useState(() =>
    toDatetimeLocalValue(new Date(Date.now() + 86400000).toISOString()),
  );
  const [inviteRide, setInviteRide] = useState(null);

  const handleRouteChange = (id, route) => {
    setRouteId(id);
    setRouteDisplay(route);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const scheduledDate = new Date(scheduledLocal);
    if (Number.isNaN(scheduledDate.getTime())) return;
    const rid = routeId != null ? Number(routeId) : null;
    createPersonal.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        routeId: rid != null && !Number.isNaN(rid) ? rid : null,
        maxParticipants: Math.max(1, Number(maxParticipants) || 20),
        scheduledDate: scheduledDate.toISOString(),
      },
      {
        onSuccess: (created) => {
          onClose?.();
          setName('');
          setDescription('');
          setRouteId(null);
          setRouteDisplay(null);
          if (created?.id != null) {
            setInviteRide({ id: created.id, name: created.name || name.trim() });
          }
        },
      },
    );
  };

  return (
    <>
    <InviteFriendsToRideModal
      open={inviteRide != null}
      rideId={inviteRide?.id}
      rideName={inviteRide?.name}
      onClose={() => setInviteRide(null)}
    />
    <AnimatedModal open={open} onClose={onClose}>
      <ModalPanel className="max-h-[90vh] w-full overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <ModalHeader title="Ride!" titleId={titleId} onClose={onClose} />

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <FormField label="Name">
            <Input id="pr-name" value={name} onChange={(ev) => setName(ev.target.value)} required maxLength={MAX_RIDE_NAME_LENGTH} />
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
          <RoutePickerField
            id="pr-route"
            value={routeId}
            onChange={handleRouteChange}
            displayRoute={routeDisplay}
          />
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
    </>
  );
}
