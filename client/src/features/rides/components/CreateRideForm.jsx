import { useState } from 'react';
import Button from '@/shared/components/ui/button/Button';
import Card from '@/shared/components/ui/card/Card';
import FormField from '@/shared/components/ui/form-field/FormField';
import Input from '@/shared/components/ui/input/Input';
import RoutePickerField from '@/features/routes/components/RoutePickerField';
import { useCreateRide } from '@/features/rides/hooks/useCreateRide';
import { clampRideName, MAX_RIDE_NAME_LENGTH } from '@/shared/constants/text-limits';

const emptyFields = (defaults = {}) => ({
  name: defaults.name ?? '',
  description: '',
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
  const [form, setForm] = useState(() => emptyFields({ name: defaultName ? clampRideName(defaultName) : '' }));
  const [routeId, setRouteId] = useState(null);
  const [routeDisplay, setRouteDisplay] = useState(null);
  const { createRide, isPending } = useCreateRide();

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRouteChange = (id, route) => {
    setRouteId(id);
    setRouteDisplay(route);
  };

  const resetRoute = () => {
    setRouteId(null);
    setRouteDisplay(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const scheduled = form.scheduledDate ? new Date(form.scheduledDate).toISOString() : new Date().toISOString();
    const resolvedRouteId =
      fixedRouteId != null ? fixedRouteId : routeId != null ? Number(routeId) : null;
    await createRide({
      clubId,
      name: form.name,
      description: form.description || '',
      scheduledDate: scheduled,
      routeId: resolvedRouteId,
      maxParticipants: Number(form.maxParticipants || 20),
      scheduleForWholeClub: Boolean(form.scheduleForWholeClub),
    });
    setForm(emptyFields({ name: defaultName ? clampRideName(defaultName) : '' }));
    resetRoute();
    onSuccess?.();
  };

  const formInner = (
    <form className={embedded ? 'mt-5 space-y-4' : 'mt-5 space-y-4'} onSubmit={handleSubmit}>
      {!embedded && clubName ? (
        <p className="text-sm text-fg-muted">
          Club: <span className="text-fg/90">{clubName}</span>
        </p>
      ) : null}
      <FormField label="Ride name">
        <Input name="name" value={form.name} onChange={handleChange} placeholder="Morning Flow Crew" required maxLength={MAX_RIDE_NAME_LENGTH} />
      </FormField>
      <FormField label="Description">
        <Input name="description" value={form.description} onChange={handleChange} placeholder="Pace, meeting spot, notes" />
      </FormField>
      {fixedRouteId == null ? (
        <RoutePickerField value={routeId} onChange={handleRouteChange} displayRoute={routeDisplay} />
      ) : (
        <p className="text-sm text-fg-muted">
          Route is fixed to this page — #{fixedRouteId}
        </p>
      )}
      <FormField label="Date and time">
        <Input name="scheduledDate" value={form.scheduledDate} onChange={handleChange} type="datetime-local" required />
      </FormField>
      <FormField label="Max participants">
        <Input name="maxParticipants" value={form.maxParticipants} onChange={handleChange} type="number" min={1} />
      </FormField>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-fg/80">
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
            ? 'mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5'
            : 'mt-2 flex flex-wrap items-center justify-end gap-3'
        }
      >
        {embedded && onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        ) : null}
        <Button variant="neon" type="submit" disabled={isPending}>
          {isPending ? 'Riding…' : 'Ride!'}
        </Button>
      </div>
    </form>
  );

  if (embedded) {
    return formInner;
  }

  return (
    <Card className="max-w-xl">
      <h2 className="text-2xl font-semibold">Ride!</h2>
      {formInner}
    </Card>
  );
}
