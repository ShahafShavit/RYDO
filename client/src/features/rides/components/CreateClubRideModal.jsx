import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import Card from '@/shared/components/ui/card/Card';
import CreateRideForm from '@/features/rides/components/CreateRideForm';

/**
 * Renders in a portal so parent layout (overflow, transforms) cannot break interaction.
 * Backdrop closes only when the backdrop itself is clicked, not when focus moves inside the panel.
 */
export default function CreateClubRideModal({ clubId, clubName, isOpen, onClose, onSuccess }) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropPointerDown = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={handleBackdropPointerDown}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(90vh,720px)] w-full max-w-xl overflow-y-auto border border-white/12 bg-[#0f0f14]/95 shadow-2xl shadow-black/40"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/10 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-xl font-semibold">
                Schedule a ride
              </h2>
              {clubName ? (
                <p className="mt-1 text-sm text-white/56">
                  For <span className="text-white/80">{clubName}</span> — members opt in from this club.
                </p>
              ) : (
                <p className="mt-1 text-sm text-white/56">Club members can join from the ride page.</p>
              )}
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-white/50 transition hover:bg-white/10 hover:text-white"
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
    </div>
  );

  return createPortal(modal, document.body);
}
