import { useEffect, useState } from 'react';
import Button from '@/shared/components/ui/button/Button';
import Card from '@/shared/components/ui/card/Card';
import FormField from '@/shared/components/ui/form-field/FormField';
import Input from '@/shared/components/ui/input/Input';
import { useCreateRide } from '@/features/rides/hooks/useCreateRide';
import { useRoutesList } from '@/features/routes/hooks/useRoutesList';

const emptyForm = {
  name: '',
  description: '',
  routeId: '',
  scheduledDate: '',
  maxParticipants: '20',
  clubId: '',
  scheduleForWholeClub: false,
};

export default function CreateRideForm({ initialClubId }) {
  const [form, setForm] = useState(emptyForm);
  const { createRide, isPending } = useCreateRide();
  const { routes, isLoading: routesLoading } = useRoutesList({ take: 120 });

  useEffect(() => {
    if (initialClubId != null && !Number.isNaN(Number(initialClubId))) {
      setForm((prev) => ({ ...prev, clubId: String(initialClubId) }));
    }
  }, [initialClubId]);

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
    await createRide({
      name: form.name,
      description: form.description || '',
      scheduledDate: scheduled,
      routeId: Number(form.routeId || 0),
      maxParticipants: Number(form.maxParticipants || 20),
      clubId: form.clubId ? Number(form.clubId) : null,
      scheduleForWholeClub: Boolean(form.scheduleForWholeClub),
    });
    setForm({ ...emptyForm, clubId: form.clubId });
  };

  return (
    <Card className="max-w-xl">
      <h2 className="text-2xl font-semibold">Create group ride</h2>
      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <FormField label="Ride name">
          <Input name="name" value={form.name} onChange={handleChange} placeholder="Morning Flow Crew" required />
        </FormField>
        <FormField label="Description">
          <Input name="description" value={form.description} onChange={handleChange} placeholder="Pace, meeting spot, notes" />
        </FormField>
        <FormField label="Route">
          <select
            name="routeId"
            className="w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white"
            value={form.routeId}
            onChange={handleChange}
            required
            disabled={routesLoading}
          >
            <option value="">Select a route</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.id} — {r.title}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Date and time">
          <Input name="scheduledDate" value={form.scheduledDate} onChange={handleChange} type="datetime-local" required />
        </FormField>
        <FormField label="Max participants">
          <Input name="maxParticipants" value={form.maxParticipants} onChange={handleChange} type="number" min={1} />
        </FormField>
        <FormField label="Club ID (optional)">
          <Input
            name="clubId"
            value={form.clubId}
            onChange={handleChange}
            placeholder="Link to a cycling club"
            type="number"
          />
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
        <Button variant="neon" type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create ride'}
        </Button>
      </form>
    </Card>
  );
}
