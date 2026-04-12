import Badge from '@/shared/components/ui/badge/Badge';

export default function OfflineMapBanner() {
  return (
    <div className="flex items-center justify-between rounded-[24px] border border-border bg-black/20 px-4 py-3 backdrop-blur-xl">
      <p className="text-sm text-fg-muted">Offline route package is ready for low-signal riding.</p>
      <Badge>Offline ready</Badge>
    </div>
  );
}
