import Button from '@/shared/components/ui/button/Button';
import Card from '@/shared/components/ui/card/Card';
import FormField from '@/shared/components/ui/form-field/FormField';
import Input from '@/shared/components/ui/input/Input';

export default function CreateRideForm() {
  return (
    <Card className="max-w-xl">
      <h2 className="text-2xl font-semibold">Create group ride</h2>
      <div className="mt-5 space-y-4">
        <FormField label="Ride name"><Input placeholder="Morning Flow Crew" /></FormField>
        <FormField label="Pick route"><Input placeholder="National Park Loop" /></FormField>
        <FormField label="Date and time"><Input type="datetime-local" /></FormField>
        <Button variant="neon">Create ride</Button>
      </div>
    </Card>
  );
}
