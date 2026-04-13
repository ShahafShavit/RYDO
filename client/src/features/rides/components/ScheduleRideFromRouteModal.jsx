import { useId } from 'react';
import Card from '@/shared/components/ui/card/Card';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ScheduleRideFromRoutePanel } from '@/features/rides/components/ScheduleRideFromRoutePanel';

export default function ScheduleRideFromRouteModal({ open, onClose, routeId, routeTitle }) {
  const titleId = useId();

  return (
    <AnimatedModal open={open} onClose={onClose}>
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(90vh,720px)] w-full overflow-y-auto border border-border bg-[var(--rydo-bg-deep)]/95 shadow-2xl shadow-black/40"
      >
        <div className="border-b border-border pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-xl font-semibold">
                Schedule a ride
              </h2>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-fg-muted transition hover:bg-surface-strong hover:text-fg"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="pt-5">
          {routeId ? (
            <ScheduleRideFromRoutePanel routeId={routeId} routeTitle={routeTitle || ''} headless />
          ) : null}
        </div>
      </Card>
    </AnimatedModal>
  );
}
