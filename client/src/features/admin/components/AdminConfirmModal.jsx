import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel } from '@/shared/components/ui/modal/ModalPrimitives';
import Button from '@/shared/components/ui/button/Button';

export default function AdminConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isPending = false,
  error = null,
}) {
  return (
    <AnimatedModal open={open} onClose={onClose} maxWidthClassName="max-w-md">
      <ModalPanel>
        <ModalHeader title={title} onClose={onClose} closeDisabled={isPending} />
        <p className="mt-2 text-sm text-fg-muted">{message}</p>
        {error ? (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'ghost' : 'primary'}
            className={variant === 'danger' ? 'text-red-300 hover:bg-red-500/15' : undefined}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </ModalPanel>
    </AnimatedModal>
  );
}
