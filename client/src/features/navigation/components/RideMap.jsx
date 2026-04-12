import Card from '@/shared/components/ui/card/Card';
import Badge from '@/shared/components/ui/badge/Badge';

export default function RideMap() {
  return (
    <Card className="min-h-[420px] overflow-hidden bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--rydo-green)_22%,transparent),transparent_34%),radial-gradient(circle_at_20%_10%,color-mix(in_srgb,var(--rydo-purple)_22%,transparent),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-fg-muted">Active navigation map</p>
          <h3 className="mt-1 text-xl font-semibold">Live ride surface</h3>
        </div>
        <Badge variant="success">Connected</Badge>
      </div>
      <div className="grid min-h-[320px] place-items-center">
        <p className="text-fg-muted">Map component goes here</p>
      </div>
    </Card>
  );
}
