import { useState } from 'react';
import { useRoutesList } from '@/features/routes/hooks/useRoutesList';
import { useUpdateRide } from '@/features/rides/hooks/useUpdateRide';
import Button from '@/shared/components/ui/button/Button';
import Card from '@/shared/components/ui/card/Card';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';

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
      <h2 className="text-xl font-semibold">Edit ride</h2>
      {ride.clubName ? (
        <p className="mt-2 text-sm text-white/64">
          Club: <span className="text-white/88">{ride.clubName}</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-white/64">Personal ride</p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-[0.14em] text-white/48" htmlFor="er-name">
            Name
          </label>
          <input
            id="er-name"
            className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#7B5CFF]"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.14em] text-white/48" htmlFor="er-desc">
            Description
          </label>
          <textarea
            id="er-desc"
            className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#7B5CFF]"
            rows={2}
            value={description}
            onChange={(ev) => setDescription(ev.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.14em] text-white/48" htmlFor="er-route">
            Route
          </label>
          <select
            id="er-route"
            className="mt-2 w-full rounded-2xl border border-white/12 bg-[#171717] px-4 py-3 text-sm text-white outline-none focus:border-[#7B5CFF]"
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
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.14em] text-white/48" htmlFor="er-when">
            When
          </label>
          <input
            id="er-when"
            type="datetime-local"
            className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#7B5CFF]"
            value={scheduledLocal}
            onChange={(ev) => setScheduledLocal(ev.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.14em] text-white/48" htmlFor="er-max">
            Max participants
          </label>
          <input
            id="er-max"
            type="number"
            min={1}
            className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#7B5CFF]"
            value={maxParticipants}
            onChange={(ev) => setMaxParticipants(ev.target.value)}
          />
        </div>

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
  return (
    <AnimatedModal open={open} onClose={onClose} zIndexClass="z-50">
      <Card className="max-h-[90vh] w-full overflow-y-auto p-6" role="dialog" aria-modal="true">
        {open && ride ? <EditRideForm ride={ride} onClose={onClose} /> : null}
      </Card>
    </AnimatedModal>
  );
}
