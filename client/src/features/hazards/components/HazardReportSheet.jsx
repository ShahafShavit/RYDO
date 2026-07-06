import { useState } from 'react';
import Button from '@/shared/components/ui/button/Button';
import Textarea from '@/shared/components/ui/textarea/Textarea';
import HazardTypePicker from '@/features/hazards/components/HazardTypePicker';
import { HAZARD_DESCRIPTION_MAX } from '@/features/hazards/hazard-constants';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import {
  ModalHeader,
  ModalPanel,
  modalControlClass,
  modalFieldLabelClass,
  modalFinePrintClass,
} from '@/shared/components/ui/modal/ModalPrimitives';
import { cn } from '@/shared/lib/cn';

export default function HazardReportSheet({ open, onClose, onSubmit, isPending }) {
  const [type, setType] = useState('pothole');
  const [description, setDescription] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({
      type,
      description: description.trim() || undefined,
    });
    setDescription('');
    onClose();
  };

  return (
    <AnimatedModal open={open} onClose={onClose} maxWidthClassName="max-w-md">
      <ModalPanel
        className="max-h-[min(90vh,640px)] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hazard-report-title"
      >
        <ModalHeader
          titleId="hazard-report-title"
          title="Report hazard"
          description="Pin at your current location on the route."
          onClose={onClose}
          closeDisabled={isPending}
          divider
        />

        <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2.5">
            <p className={modalFieldLabelClass}>What did you see?</p>
            <HazardTypePicker value={type} onChange={setType} disabled={isPending} />
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="hazard-report-note" className={modalFieldLabelClass}>
                Optional note
              </label>
              <span className={modalFinePrintClass} aria-live="polite">
                {description.length}/{HAZARD_DESCRIPTION_MAX}
              </span>
            </div>
            <Textarea
              id="hazard-report-note"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, HAZARD_DESCRIPTION_MAX))}
              placeholder="Add a short description for other riders"
              rows={3}
              disabled={isPending}
              className={cn(modalControlClass, 'min-h-20')}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="neon"
              disabled={isPending}
              className="border-amber-400/50 bg-amber-500/20 text-amber-50 shadow-[0_0_20px_color-mix(in_srgb,var(--rydo-amber)_25%,transparent)] hover:border-amber-300/60 hover:bg-amber-500/30"
            >
              {isPending ? 'Reporting…' : 'Report'}
            </Button>
          </div>
        </form>
      </ModalPanel>
    </AnimatedModal>
  );
}
