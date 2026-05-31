import { useCallback, useId, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Upload } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { getCroppedImg } from '@/shared/lib/crop-image';
import UserAvatar from '@/shared/components/user/UserAvatar';
import Button from '@/shared/components/ui/button/Button';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel } from '@/shared/components/ui/modal/ModalPrimitives';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import {
  isClubUploadedAvatarUrl,
  resolveClubAvatarDisplayUrl,
} from '@/shared/lib/avatar-url';

/**
 * @param {number} props.clubId
 * @param {string} props.clubName
 * @param {string} props.avatarSeed Seed phrase for the generated avatar
 * @param {string} props.avatarUrl Resolved display URL or upload path from API/form
 * @param {(next: string) => void} props.onAvatarSeedChange
 * @param {(uploadPath: string) => void} props.onUploaded
 * @param {() => void} props.onUseGenerated Clears uploaded photo; keep current seed
 */
export default function ClubAvatarEditor({
  clubId,
  clubName,
  avatarSeed,
  avatarUrl,
  onAvatarSeedChange,
  onUploaded,
  onUseGenerated,
}) {
  const cropTitleId = useId();
  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const croppedAreaPixelsRef = useRef(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  const hasUpload = isClubUploadedAvatarUrl(avatarUrl);
  const previewUrl =
    resolveClubAvatarDisplayUrl({
      clubId,
      clubName,
      avatarSeed,
      avatarUrl: hasUpload ? avatarUrl : '',
    }) ?? '';

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
    if (clubId == null || Number.isNaN(Number(clubId))) {
      setUploadError('Club is not ready. Try again in a moment.');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixelsRef.current);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const res = await clubsApi.uploadAvatar(clubId, file);
      const next = typeof res?.avatarUrl === 'string' ? res.avatarUrl.trim() : '';
      if (!next) throw new Error('Upload did not return avatarUrl');
      onUploaded(next);
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
          displayName={clubName?.trim() || 'Club'}
          sizeClass="h-16 w-16"
          textClass="text-lg"
        />
        <p className="min-w-0 flex-1 text-xs text-fg-muted">
          Choose a seed phrase for a generated avatar, or upload a square photo (1:1).
        </p>
      </div>

      {!hasUpload ? (
        <div className="space-y-2">
          <label className="block text-sm text-fg/85" htmlFor="club-avatar-seed">
            Seed phrase
          </label>
          <input
            id="club-avatar-seed"
            value={avatarSeed ?? ''}
            onChange={(e) => onAvatarSeedChange(e.target.value)}
            placeholder="e.g. coastalOpenRollers"
            maxLength={64}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-fg placeholder:text-fg-subtle focus:border-rydo-purple focus:outline-none focus:ring-1 focus:ring-rydo-purple"
          />
          <p className="text-xs text-fg-muted">Any short phrase works — the same seed always produces the same image.</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <label
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg hover:border-rydo-purple/50',
          )}
        >
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
              onUseGenerated();
            }}
          >
            Use generated avatar
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
