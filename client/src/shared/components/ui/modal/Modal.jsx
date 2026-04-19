/**
 * Legacy non-portal modal — prefer `AnimatedModal` + `ModalPanel`.
 * Styling matches portal modals (`.rydo-modal-scrim` + `.rydo-glass`).
 */
export default function Modal({ title = 'Modal', children }) {
  return (
    <div className="fixed inset-0 z-(--rydo-z-modal) flex items-center justify-center p-6">
      <div className="rydo-modal-scrim" aria-hidden />
      <div className="relative z-10 w-full max-w-lg">
        <div className="rydo-modal-panel rydo-glass rounded-[28px] p-6">
          <h3 className="mb-4 text-xl font-semibold text-fg">{title}</h3>
          {children}
        </div>
      </div>
    </div>
  );
}
