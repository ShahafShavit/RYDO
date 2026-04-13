import { useId } from 'react';
import Card from '@/shared/components/ui/card/Card';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import CreateRideForm from '@/features/rides/components/CreateRideForm';

/**
 * Renders in a portal so parent layout (overflow, transforms) cannot break interaction.
 * Backdrop closes only when the backdrop itself is clicked, not when focus moves inside the panel.
 */
export default function CreateClubRideModal({ clubId, clubName, isOpen, onClose, onSuccess }) {
  const titleId = useId();

  return (
    <AnimatedModal open={isOpen} onClose={onClose}>
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
                Ride!
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
      </Card>
    </AnimatedModal>
  );
}
