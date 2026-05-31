import CompactRouteMapPreview from '@/features/routes/components/CompactRouteMapPreview';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import { formatTrailMetaLabel } from '@/features/routes/utils/route-formatters';
import { cn } from '@/shared/lib/cn';

/**
 * @param {{ route: object, selected?: boolean, onSelect: () => void }} props
 */
export default function RoutePickerRow({ route, selected = false, onSelect }) {
  const { formatKm } = useFormatDistance();
  const title = route?.title || `Route #${route?.id ?? ''}`;
  const terrain = formatTrailMetaLabel(route?.terrain || 'mixed');
  const distance =
    route?.distanceKm != null && Number.isFinite(Number(route.distanceKm))
      ? formatKm(route.distanceKm)
      : null;
  const meta = [distance, terrain].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full gap-3 rounded-2xl border p-2 text-left transition',
        selected
          ? 'border-rydo-purple/50 bg-rydo-purple/10'
          : 'border-border bg-surface hover:border-border-strong hover:bg-surface-strong',
      )}
    >
      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl">
        <CompactRouteMapPreview
          preview={route?.preview ?? null}
          className="h-16 w-24 rounded-xl border-0 bg-surface"
          compactPlaceholder
        />
      </div>
      <div className="min-w-0 flex-1 py-1">
        <p className="truncate font-medium text-fg">{title}</p>
        {meta ? <p className="mt-0.5 truncate text-sm text-fg-muted">{meta}</p> : null}
      </div>
    </button>
  );
}
