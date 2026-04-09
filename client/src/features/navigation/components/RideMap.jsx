import Card from '@/shared/components/ui/card/Card';
import Badge from '@/shared/components/ui/badge/Badge';

export default function RideMap() {
  return (
    <Card className="min-h-[420px] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(33,241,168,0.16),transparent_34%),radial-gradient(circle_at_20%_10%,rgba(123,92,255,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/52">Active navigation map</p>
          <h3 className="mt-1 text-xl font-semibold">Live ride surface</h3>
        </div>
        <Badge variant="success">Connected</Badge>
      </div>
      <div className="grid min-h-[320px] place-items-center">
        <p className="text-white/60">Map component goes here</p>
      </div>
    </Card>
  );
}
