import { useState } from 'react';
import Button from '@/shared/components/ui/button/Button';
import Card from '@/shared/components/ui/card/Card';
import FormField from '@/shared/components/ui/form-field/FormField';
import Input from '@/shared/components/ui/input/Input';
import { useCreateRide } from '@/features/rides/hooks/useCreateRide';
import { useRoutesList } from '@/features/routes/hooks/useRoutesList';

const emptyFields = (defaults = {}) => ({
  name: defaults.name ?? '',
  description: '',
  routeId: defaults.routeId != null ? String(defaults.routeId) : '',
  scheduledDate: '',
  maxParticipants: '20',
  scheduleForWholeClub: false,
});

/**
 * @param {{ clubId: number, clubName?: string, embedded?: boolean, onCancel?: () => void, onSuccess?: () => void, fixedRouteId?: number, defaultName?: string }} props
 */
export default function CreateRideForm({
  clubId,
  clubName,
  embedded = false,
  onCancel,
  onSuccess,
  fixedRouteId,
  defaultName,
}) {
  const [form, setForm] = useState(() => emptyFields({ routeId: fixedRouteId, name: defaultName }));
  const { createRide, isPending } = useCreateRide();
  const { routes, isLoading: routesLoading } = useRoutesList({ take: 120 });

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const scheduled = form.scheduledDate ? new Date(form.scheduledDate).toISOString() : new Date().toISOString();
    const routeId =
      fixedRouteId != null ? fixedRouteId : form.routeId ? Number(form.routeId) : null;
    await createRide({
      clubId,
      name: form.name,
      description: form.description || '',
      scheduledDate: scheduled,
      routeId,
      maxParticipants: Number(form.maxParticipants || 20),
      scheduleForWholeClub: Boolean(form.scheduleForWholeClub),
    });
    setForm(emptyFields({ routeId: fixedRouteId, name: defaultName }));
    onSuccess?.();
  };

  const formInner = (
    <form className={embedded ? 'mt-5 space-y-4' : 'mt-5 space-y-4'} onSubmit={handleSubmit}>
      {!embedded && clubName ? (
        <p className="text-sm text-white/56">
          Club: <span className="text-white/88">{clubName}</span>
        </p>
      ) : null}
      <FormField label="Ride name">
        <Input name="name" value={form.name} onChange={handleChange} placeholder="Morning Flow Crew" required />
      </FormField>
      <FormField label="Description">
        <Input name="description" value={form.description} onChange={handleChange} placeholder="Pace, meeting spot, notes" />
      </FormField>
      {fixedRouteId == null ? (
        <FormField label="Route">
          <select
            name="routeId"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition-colors focus:border-[#7B5CFF]/60 focus:outline-none focus:ring-2 focus:ring-[#7B5CFF]/25 disabled:opacity-50"
            value={form.routeId}
            onChange={handleChange}
            disabled={routesLoading}
          >
            <option value="">No route yet (optional)</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.id} — {r.title}
              </option>
            ))}
          </select>
        </FormField>
      ) : (
        <p className="text-sm text-white/56">
          Route is fixed to this page — #{fixedRouteId}
        </p>
      )}
      <FormField label="Date and time">
        <Input name="scheduledDate" value={form.scheduledDate} onChange={handleChange} type="datetime-local" required />
      </FormField>
      <FormField label="Max participants">
        <Input name="maxParticipants" value={form.maxParticipants} onChange={handleChange} type="number" min={1} />
      </FormField>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          name="scheduleForWholeClub"
          checked={form.scheduleForWholeClub}
          onChange={handleChange}
        />
        Schedule for whole club (club admins only — adds all active members up to max)
      </label>
      <div
        className={
          embedded
            ? 'mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-5'
            : 'mt-2 flex flex-wrap items-center justify-end gap-3'
        }
      >
        {embedded && onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        ) : null}
        <Button variant="neon" type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create ride'}
        </Button>
      </div>
    </form>
  );

  if (embedded) {
    return formInner;
  }

  return (
    <Card className="max-w-xl">
      <h2 className="text-2xl font-semibold">Schedule a club ride</h2>
      {formInner}
    </Card>
  );
}
