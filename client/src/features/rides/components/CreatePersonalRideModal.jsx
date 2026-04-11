import { useState } from 'react';
import { useRoutesList } from '@/features/routes/hooks/useRoutesList';
import { useCreatePersonalRide } from '@/features/rides/hooks/useCreatePersonalRide';
import Button from '@/shared/components/ui/button/Button';
import Card from '@/shared/components/ui/card/Card';

function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreatePersonalRideModal({ open, onClose }) {
  const { routes, isLoading: routesLoading } = useRoutesList({ take: 80 });
  const createPersonal = useCreatePersonalRide();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [routeId, setRouteId] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [scheduledLocal, setScheduledLocal] = useState(() =>
    toDatetimeLocalValue(new Date(Date.now() + 86400000).toISOString()),
  );

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <h2 className="text-xl font-semibold">Schedule a personal ride</h2>
        <p className="mt-2 text-sm text-white/64">No club — just you (and guests you invite later).</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.14em] text-white/48" htmlFor="pr-name">
              Name
            </label>
            <input
              id="pr-name"
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#7B5CFF]"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.14em] text-white/48" htmlFor="pr-desc">
              Description
            </label>
            <textarea
              id="pr-desc"
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#7B5CFF]"
              rows={2}
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.14em] text-white/48" htmlFor="pr-route">
              Route
            </label>
            <select
              id="pr-route"
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
            <label className="text-xs uppercase tracking-[0.14em] text-white/48" htmlFor="pr-when">
              When
            </label>
            <input
              id="pr-when"
              type="datetime-local"
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#7B5CFF]"
              value={scheduledLocal}
              onChange={(ev) => setScheduledLocal(ev.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.14em] text-white/48" htmlFor="pr-max">
              Max participants
            </label>
            <input
              id="pr-max"
              type="number"
              min={1}
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#7B5CFF]"
              value={maxParticipants}
              onChange={(ev) => setMaxParticipants(ev.target.value)}
            />
          </div>

          {createPersonal.isError ? (
            <p className="text-sm text-red-400">{createPersonal.error?.message || 'Could not create ride.'}</p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={createPersonal.isPending}>
              {createPersonal.isPending ? 'Saving…' : 'Create ride'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
