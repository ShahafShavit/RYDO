import { useId } from 'react';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel } from '@/shared/components/ui/modal/ModalPrimitives';
import { ScheduleRideFromRoutePanel } from '@/features/rides/components/ScheduleRideFromRoutePanel';

export default function ScheduleRideFromRouteModal({ open, onClose, routeId, routeTitle }) {
  const titleId = useId();

  return (
    <AnimatedModal open={open} onClose={onClose}>
      <ModalPanel
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(90vh,720px)] w-full overflow-y-auto"
      >
        <ModalHeader title="Ride!" titleId={titleId} onClose={onClose} divider />
        <div className="pt-5">
          {routeId ? (
            <ScheduleRideFromRoutePanel routeId={routeId} routeTitle={routeTitle || ''} headless />
          ) : null}
        </div>
      </ModalPanel>
    </AnimatedModal>
  );
}
