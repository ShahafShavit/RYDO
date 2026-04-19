import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRoutesList } from '@/features/routes/hooks/useRoutesList';
import { useUpdateRide } from '@/features/rides/hooks/useUpdateRide';
import Button from '@/shared/components/ui/button/Button';
import FormField from '@/shared/components/ui/form-field/FormField';
import Input from '@/shared/components/ui/input/Input';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel, modalControlClass } from '@/shared/components/ui/modal/ModalPrimitives';
import { cn } from '@/shared/lib/cn';
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
  const { routes, isLoading: routesLoading } = useRoutesList({ take: 120 });
  const { updateRide, isPending, isError, error } = useUpdateRide(rideId);

  const [name, setName] = useState(() => ride.name || '');
  const [description, setDescription] = useState(() => ride.notes || '');
  const [routeId, setRouteId] = useState(() => (ride.routeId != null ? String(ride.routeId) : ''));
  const [maxParticipants, setMaxParticipants] = useState(() => String(ride.maxParticipants ?? 20));
  const [scheduledLocal, setScheduledLocal] = useState(() =>
    toDatetimeLocalValue(ride.scheduledDate || ride.time),
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
    updateRide(
      {
        name: name.trim(),
        description: description.trim(),
        routeId: rid,
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
          <Input id="er-name" value={name} onChange={(ev) => setName(ev.target.value)} required />
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
        <FormField label="Route">
          <select
            id="er-route"
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
            id="er-when"
            type="datetime-local"
            value={scheduledLocal}
            onChange={(ev) => setScheduledLocal(ev.target.value)}
            required
          />
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
