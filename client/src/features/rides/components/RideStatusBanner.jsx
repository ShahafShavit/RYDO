import Badge from '@/shared/components/ui/badge/Badge';

export default function RideStatusBanner() {
  return (
    <div className="flex items-center justify-between rounded-[28px] border border-[#21F1A8]/25 bg-[#21F1A8]/8 px-5 py-4 backdrop-blur-xl">
      <div>
        <p className="text-sm font-medium">Live ride session ready</p>
      </div>
      <Badge variant="success">Live</Badge>
    </div>
  );
}
