import Button from '@/shared/components/ui/button/Button';
import Card from '@/shared/components/ui/card/Card';
import FormField from '@/shared/components/ui/form-field/FormField';
import Input from '@/shared/components/ui/input/Input';
import Textarea from '@/shared/components/ui/textarea/Textarea';

export default function HazardReportForm() {
  return (
    <Card className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Report live trail issue</h1>
      <p className="mt-2 text-white/64">Surface closures, roadwork, blocked gates or hazards affecting the ride.</p>
      <div className="mt-6 space-y-4">
        <FormField label="Title"><Input placeholder="Gate closed" /></FormField>
        <FormField label="Severity"><Input placeholder="Medium / High" /></FormField>
        <FormField label="Details"><Textarea placeholder="Add context for other riders." /></FormField>
        <Button variant="neon">Publish report</Button>
      </div>
    </Card>
  );
}
