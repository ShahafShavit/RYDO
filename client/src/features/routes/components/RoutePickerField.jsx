import { useState } from 'react';
import FormField from '@/shared/components/ui/form-field/FormField';
import Button from '@/shared/components/ui/button/Button';
import RoutePickerModal from '@/features/routes/components/RoutePickerModal';
import CompactRouteMapPreview from '@/features/routes/components/CompactRouteMapPreview';

/**
 * Optional route attachment for ride forms.
 *
 * @param {{
 *   value: number | null,
 *   onChange: (routeId: number | null, route?: object | null) => void,
 *   displayRoute?: { id?: number, title?: string, preview?: object | null, distanceKm?: number } | null,
 *   label?: string,
 *   id?: string,
 * }} props
 */
export default function RoutePickerField({
  value,
  onChange,
  displayRoute = null,
  label = 'Route',
  id,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const hasRoute = value != null;
  const title =
    displayRoute?.title ||
    (hasRoute ? `Route #${value}` : null);

  const handleSelect = (route) => {
    const rid = route?.id != null ? Number(route.id) : null;
    if (rid == null || Number.isNaN(rid)) return;
    onChange(rid, route);
  };

  const handleClear = () => {
    onChange(null, null);
  };

  return (
    <>
      <FormField label={label} id={id}>
        {hasRoute ? (
          <div className="flex gap-3 rounded-2xl border border-border bg-surface p-3">
            <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl">
              <CompactRouteMapPreview
                preview={displayRoute?.preview ?? null}
                className="h-14 w-20 rounded-xl border-0 bg-surface-strong"
                compactPlaceholder
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-fg">{title}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
                  Change
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={handleClear}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-3">
            <p className="text-sm text-fg-muted">No route yet — you can add one later.</p>
            <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
              Choose route
            </Button>
          </div>
        )}
      </FormField>

      <RoutePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
        selectedRouteId={value}
      />
    </>
  );
}

/** Build display metadata from a ride API payload for edit forms. */
export function routeDisplayFromRide(ride) {
  if (ride?.routeId == null) return null;
  return {
    id: ride.routeId,
    title: ride.routeTitle || `Route #${ride.routeId}`,
    preview: ride.routePreview ?? null,
  };
}
