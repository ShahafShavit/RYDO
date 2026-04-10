import { useState } from 'react';
import Button from '@/shared/components/ui/button/Button';
import Card from '@/shared/components/ui/card/Card';
import FormField from '@/shared/components/ui/form-field/FormField';
import Input from '@/shared/components/ui/input/Input';
import { useCreateRide } from '@/features/rides/hooks/useCreateRide';

export default function CreateRideForm() {
  const [form, setForm] = useState({ name: '', routeId: '', scheduledDate: '' });
  const { createRide, isPending } = useCreateRide();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await createRide({
      name: form.name,
      routeId: Number(form.routeId || 0),
      scheduledDate: form.scheduledDate,
    });
    setForm({ name: '', routeId: '', scheduledDate: '' });
  };

  return (
    <Card className="max-w-xl">
      <h2 className="text-2xl font-semibold">Create group ride</h2>
      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <FormField label="Ride name"><Input name="name" value={form.name} onChange={handleChange} placeholder="Morning Flow Crew" /></FormField>
        <FormField label="Pick route"><Input name="routeId" value={form.routeId} onChange={handleChange} placeholder="Route ID" /></FormField>
        <FormField label="Date and time"><Input name="scheduledDate" value={form.scheduledDate} onChange={handleChange} type="datetime-local" /></FormField>
        <Button variant="neon" type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create ride'}</Button>
      </form>
    </Card>
  );
}
