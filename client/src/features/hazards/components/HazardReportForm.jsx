import { useState } from 'react';
import Button from '@/shared/components/ui/button/Button';
import Card from '@/shared/components/ui/card/Card';
import FormField from '@/shared/components/ui/form-field/FormField';
import Input from '@/shared/components/ui/input/Input';
import Textarea from '@/shared/components/ui/textarea/Textarea';
import { useReportHazard } from '@/features/hazards/hooks/useReportHazard';

export default function HazardReportForm() {
  const { reportHazard, isPending } = useReportHazard();
  const [form, setForm] = useState({
    type: 'gate',
    severity: 'medium',
    description: '',
    latitude: '',
    longitude: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await reportHazard({
      type: form.type,
      severity: form.severity,
      description: form.description,
      latitude: Number(form.latitude || 0),
      longitude: Number(form.longitude || 0),
    });
    setForm({ type: 'gate', severity: 'medium', description: '', latitude: '', longitude: '' });
  };

  return (
    <Card className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Report live trail issue</h1>
      <p className="mt-2 text-white/64">Surface closures, roadwork, blocked gates or hazards affecting the ride.</p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <FormField label="Type"><Input name="type" value={form.type} onChange={handleChange} placeholder="gate" /></FormField>
        <FormField label="Severity"><Input name="severity" value={form.severity} onChange={handleChange} placeholder="medium" /></FormField>
        <FormField label="Latitude"><Input name="latitude" value={form.latitude} onChange={handleChange} placeholder="31.7683" /></FormField>
        <FormField label="Longitude"><Input name="longitude" value={form.longitude} onChange={handleChange} placeholder="35.2137" /></FormField>
        <FormField label="Details"><Textarea name="description" value={form.description} onChange={handleChange} placeholder="Add context for other riders." /></FormField>
        <Button variant="neon" type="submit" disabled={isPending}>{isPending ? 'Publishing…' : 'Publish report'}</Button>
      </form>
    </Card>
  );
}
