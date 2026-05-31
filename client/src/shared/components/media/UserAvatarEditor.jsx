import { useCallback, useId, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Upload } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { getCroppedImg } from '@/shared/lib/crop-image';
import UserAvatar from '@/shared/components/user/UserAvatar';
import Button from '@/shared/components/ui/button/Button';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel } from '@/shared/components/ui/modal/ModalPrimitives';
import { accountApi } from '@/features/account/api/account-api';
import {
  isUserUploadedAvatarUrl,
  resolveUserAvatarDisplayUrl,
} from '@/shared/lib/avatar-url';

/**
 * @param {string} props.handle Used for the default seeded avatar preview
 * @param {string} props.displayName For initials fallback
 * @param {string} props.avatarUrl Stored value (upload path, empty, or resolved default from API)
 * @param {(next: string) => void} props.onAvatarUrlChange Empty string clears an uploaded photo
 */
export default function UserAvatarEditor({ handle, displayName, avatarUrl, onAvatarUrlChange }) {
  const cropTitleId = useId();
  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const croppedAreaPixelsRef = useRef(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  const hasUpload = isUserUploadedAvatarUrl(avatarUrl);
  const previewUrl = resolveUserAvatarDisplayUrl(handle, avatarUrl) ?? '';

  const onCropComplete = useCallback((_, croppedPixels) => {
    croppedAreaPixelsRef.current = croppedPixels;
  }, []);

  const resetCropState = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    croppedAreaPixelsRef.current = null;
  };

  const handlePickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setUploadError('');
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrc(reader.result);
      setCropOpen(true);
    });
    reader.readAsDataURL(file);
  };

  const handleApplyCrop = async () => {
    if (!imageSrc || !croppedAreaPixelsRef.current) return;
    setUploadError('');
    setUploading(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixelsRef.current);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const res = await accountApi.uploadAvatar(file);
      const next = typeof res?.avatarUrl === 'string' ? res.avatarUrl.trim() : '';
      if (!next) throw new Error('Upload did not return avatarUrl');
      onAvatarUrlChange(next);
      setCropOpen(false);
      resetCropState();
    } catch (err) {
      console.error(err);
      setUploadError(err?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar
          avatarUrl={previewUrl}
          displayName={displayName}
          sizeClass="h-16 w-16"
          textClass="text-lg"
        />
        <p className="min-w-0 flex-1 text-xs text-fg-muted">
          Your default avatar is generated from your handle. Upload a square photo (1:1) to replace it.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className={cn('inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg hover:border-rydo-purple/50')}>
          <Upload className="h-4 w-4" aria-hidden />
          Upload photo
          <input type="file" accept="image/*" className="sr-only" onChange={handlePickFile} />
        </label>
        {hasUpload ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setUploadError('');
              onAvatarUrlChange('');
            }}
          >
            Use default avatar
          </Button>
        ) : null}
      </div>

      {uploadError ? <p className="text-sm text-red-400">{uploadError}</p> : null}

      <AnimatedModal
        open={cropOpen}
        onClose={() => {
          if (uploading) return;
          setCropOpen(false);
          resetCropState();
        }}
        maxWidthClassName="max-w-lg"
      >
        <ModalPanel role="dialog" aria-modal="true" aria-labelledby={cropTitleId}>
          <ModalHeader
            title="Crop to square"
            titleId={cropTitleId}
            description="Adjust the square. Result must be 1:1."
            closeDisabled={uploading}
            onClose={() => {
              if (uploading) return;
              setCropOpen(false);
              resetCropState();
            }}
          />
          <div className="relative mt-4 h-64 w-full overflow-hidden rounded-xl bg-black/80 sm:h-80">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            ) : null}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <label className="flex flex-1 items-center gap-2 text-sm text-fg-muted">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
            </label>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => {
                setCropOpen(false);
                resetCropState();
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={uploading || !imageSrc} onClick={handleApplyCrop}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </ModalPanel>
      </AnimatedModal>
    </div>
  );
}
