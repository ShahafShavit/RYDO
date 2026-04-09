import Button from '@/shared/components/ui/button/Button';

export default function NavigationControls() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="success">Start</Button>
      <Button variant="secondary">Center</Button>
      <Button variant="secondary">Offline map</Button>
    </div>
  );
}
