import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import RoutePickerField, { routeDisplayFromRide } from '@/features/routes/components/RoutePickerField';
import { useUpdateRide } from '@/features/rides/hooks/useUpdateRide';
import { rideEventWindow } from '@/features/rides/utils/rideEventWindow';
import Button from '@/shared/components/ui/button/Button';
import FormField from '@/shared/components/ui/form-field/FormField';
import Input from '@/shared/components/ui/input/Input';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel, modalControlClass } from '@/shared/components/ui/modal/ModalPrimitives';
import { cn } from '@/shared/lib/cn';
import { MAX_RIDE_NAME_LENGTH } from '@/shared/constants/text-limits';
import { ROUTES } from '@/app/router/route-paths';

function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Mounted only when `ride` is set — initial state comes from first render. */
function EditRideForm({ ride, onClose }) {
  const rideId = String(ride.id);
  const { updateRide, isPending, isError, error } = useUpdateRide(rideId);

  const [name, setName] = useState(() => ride.name || '');
  const [description, setDescription] = useState(() => ride.notes || '');
  const [routeId, setRouteId] = useState(() => (ride.routeId != null ? Number(ride.routeId) : null));
  const [routeDisplay, setRouteDisplay] = useState(() => routeDisplayFromRide(ride));
  const [maxParticipants, setMaxParticipants] = useState(() => String(ride.maxParticipants ?? 20));
  const [scheduledLocal, setScheduledLocal] = useState(() =>
    toDatetimeLocalValue(ride.scheduledDate || ride.time),
  );

  const windowMeta = rideEventWindow(ride);
  const scheduledDateLocked = !windowMeta.canEditScheduledDate;

  const handleRouteChange = (id, route) => {
    setRouteId(id);
    setRouteDisplay(route);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const scheduledDate = scheduledDateLocked
      ? new Date(ride.scheduledDate || ride.time)
      : new Date(scheduledLocal);
    if (Number.isNaN(scheduledDate.getTime())) return;
    const rid = routeId != null ? Number(routeId) : null;
    updateRide(
      {
        name: name.trim(),
        description: description.trim(),
        routeId: rid != null && !Number.isNaN(rid) ? rid : null,
        maxParticipants: Math.max(1, Number(maxParticipants) || 20),
        scheduledDate: scheduledDate.toISOString(),
      },
      {
        onSuccess: () => onClose?.(),
      },
    );
  };

  return (
    <>
      {ride.clubName ? (
        <p className="mt-4 text-sm text-fg-muted">
          Club:{' '}
          {ride.clubId != null ? (
            <Link
              to={ROUTES.clubDetails.replace(':clubId', String(ride.clubId))}
              className="font-medium text-rydo-purple hover:underline"
            >
              {ride.clubName}
            </Link>
          ) : (
            <span className="text-fg/90">{ride.clubName}</span>
          )}
        </p>
      ) : (
        <p className="mt-4 text-sm text-fg-muted">Personal ride</p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField label="Name">
          <Input id="er-name" value={name} onChange={(ev) => setName(ev.target.value)} required maxLength={MAX_RIDE_NAME_LENGTH} />
        </FormField>
        <FormField label="Description">
          <textarea
            id="er-desc"
            className={cn(modalControlClass, 'min-h-[4.5rem] resize-y')}
            rows={2}
            value={description}
            onChange={(ev) => setDescription(ev.target.value)}
          />
        </FormField>
        <RoutePickerField
          id="er-route"
          value={routeId}
          onChange={handleRouteChange}
          displayRoute={routeDisplay}
        />
        <FormField label="When">
          <Input
            id="er-when"
            type="datetime-local"
            value={scheduledLocal}
            onChange={(ev) => setScheduledLocal(ev.target.value)}
            required
            disabled={scheduledDateLocked}
          />
          {scheduledDateLocked ? (
            <p className="mt-1.5 text-xs text-fg-subtle">
              Start time can&apos;t be changed after the ride begins.
            </p>
          ) : null}
        </FormField>
        <FormField label="Max participants">
          <Input
            id="er-max"
            type="number"
            min={1}
            value={maxParticipants}
            onChange={(ev) => setMaxParticipants(ev.target.value)}
          />
        </FormField>

        {isError ? <p className="text-sm text-red-400">{error?.message || 'Could not save changes.'}</p> : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}

/** @param {{ open: boolean, onClose: () => void, ride: object | null }} props */
export default function EditRideModal({ open, onClose, ride }) {
  const titleId = useId();
  return (
    <AnimatedModal open={open} onClose={onClose}>
      <ModalPanel className="max-h-[90vh] w-full overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        {open && ride ? (
          <>
            <ModalHeader title="Edit ride" titleId={titleId} onClose={onClose} />
            <EditRideForm ride={ride} onClose={onClose} />
          </>
        ) : null}
      </ModalPanel>
    </AnimatedModal>
  );
}
