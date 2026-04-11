import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import Card from '@/shared/components/ui/card/Card';
import { ScheduleRideFromRoutePanel } from '@/features/rides/components/ScheduleRideFromRoutePanel';

export default function ScheduleRideFromRouteModal({ open, onClose, routeId, routeTitle }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
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
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropPointerDown = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const modal = (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm sm:p-6"
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
              <p className="mt-1 text-sm text-white/56">For this route</p>
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
        <div className="pt-5">
          {routeId ? (
            <ScheduleRideFromRoutePanel routeId={routeId} routeTitle={routeTitle || ''} headless />
          ) : null}
        </div>
      </Card>
    </div>
  );

  return createPortal(modal, document.body);
}
