import Button from '@/shared/components/ui/button/Button';
import { useShare } from '@/shared/hooks/useShare';
import ShareSheetModal from '@/shared/components/share/ShareSheetModal';

/**
 * Desktop share trigger — opens QR modal, copies link, and invokes native share.
 */
export default function ShareButton({
  path,
  title,
  text,
  modalTitle = 'Share',
  variant = 'secondary',
  className,
  children = 'Share',
  disabled = false,
}) {
  const { share, modalProps } = useShare({ path, title, text });

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={className}
        onClick={share}
        disabled={disabled || !path}
      >
        {children}
      </Button>
      <ShareSheetModal {...modalProps} title={modalTitle} />
    </>
  );
}
