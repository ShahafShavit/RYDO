import { useId } from 'react';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel } from '@/shared/components/ui/modal/ModalPrimitives';
import CreateRideForm from '@/features/rides/components/CreateRideForm';

/**
 * Renders in a portal so parent layout (overflow, transforms) cannot break interaction.
 * Backdrop closes only when the backdrop itself is clicked, not when focus moves inside the panel.
 */
export default function CreateClubRideModal({ clubId, clubName, isOpen, onClose, onSuccess }) {
  const titleId = useId();

  return (
    <AnimatedModal open={isOpen} onClose={onClose}>
      <ModalPanel
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(90vh,720px)] w-full overflow-y-auto"
      >
        <ModalHeader title="Ride!" titleId={titleId} onClose={onClose} divider />

        <CreateRideForm
          clubId={clubId}
          clubName={clubName}
          embedded
          onCancel={onClose}
          onSuccess={() => {
            onSuccess?.();
            onClose();
          }}
        />
      </ModalPanel>
    </AnimatedModal>
  );
}
