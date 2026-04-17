import { useCallback, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Image as ImageIcon, Link2, Upload } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { getCroppedImg } from '@/shared/lib/crop-image';
import UserAvatar from '@/shared/components/user/UserAvatar';
import Button from '@/shared/components/ui/button/Button';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { accountApi } from '@/features/account/api/account-api';
import { clubsApi } from '@/features/clubs/api/clubs-api';

const DICEBEAR_USER = 'https://api.dicebear.com/7.x/avataaars/svg?seed=YourName';
const DICEBEAR_CLUB = 'https://api.dicebear.com/7.x/shapes/svg?seed=YourClubName';

/**
 * @param {'user' | 'club'} props.kind
 * @param {string} props.displayName For initials preview
 * @param {string} props.avatarUrl Current value (URL or /api/media/…)
 * @param {(next: string) => void} props.onAvatarUrlChange
 * @param {number} [props.clubId] Required when kind === 'club' for uploads
 */
export default function AvatarOrUrlEditor({ kind, displayName, avatarUrl, onAvatarUrlChange, clubId }) {
  const [section, setSection] = useState('url');
  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const croppedAreaPixelsRef = useRef(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

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
      if (kind === 'club' && (clubId == null || Number.isNaN(Number(clubId)))) {
        setUploadError('Club is not ready. Try again in a moment.');
        return;
      }
      const res =
        kind === 'user'
          ? await accountApi.uploadAvatar(file)
          : await clubsApi.uploadAvatar(clubId, file);
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

  const exampleUrl = kind === 'user' ? DICEBEAR_USER : DICEBEAR_CLUB;
  const playgroundUrl = 'https://www.dicebear.com/playground/';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSection('url')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition',
            section === 'url'
              ? 'border-rydo-purple bg-rydo-purple/15 text-fg'
              : 'border-border bg-surface text-fg-muted hover:border-border-strong',
          )}
        >
          <Link2 className="h-4 w-4" aria-hidden />
          Image URL
        </button>
        <button
          type="button"
          onClick={() => setSection('upload')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition',
            section === 'upload'
              ? 'border-rydo-purple bg-rydo-purple/15 text-fg'
              : 'border-border bg-surface text-fg-muted hover:border-border-strong',
          )}
        >
          <Upload className="h-4 w-4" aria-hidden />
          Upload (1:1)
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar avatarUrl={avatarUrl} displayName={displayName} sizeClass="h-16 w-16" textClass="text-lg" />
        <p className="min-w-0 flex-1 text-xs text-fg-muted">
          Use a <strong className="text-fg/90">square</strong> image (1:1). For a generated avatar, try{' '}
          <a href={playgroundUrl} target="_blank" rel="noreferrer" className="text-rydo-purple underline">
            Dicebear
          </a>{' '}
          and paste the URL below, or upload a photo and crop it square here.
        </p>
      </div>

      {section === 'url' ? (
        <div className="space-y-2">
          <input
            value={avatarUrl ?? ''}
            onChange={(e) => onAvatarUrlChange(e.target.value)}
            type="url"
            placeholder="https://…"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-fg placeholder:text-fg-subtle focus:border-rydo-purple focus:outline-none focus:ring-1 focus:ring-rydo-purple"
          />
          <p className="text-xs text-fg-muted">
            Example: <span className="font-mono text-[11px] text-fg/80">{exampleUrl}</span>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="flex cursor-pointer flex-col items-start gap-2">
            <span className="text-sm text-fg/85">Choose a square crop from any photo</span>
            <input type="file" accept="image/*" className="sr-only" onChange={handlePickFile} />
            <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg hover:border-rydo-purple/50">
              <ImageIcon className="h-4 w-4" aria-hidden />
              Choose image…
            </span>
          </label>
          {uploadError ? <p className="text-sm text-red-400">{uploadError}</p> : null}
        </div>
      )}

      <AnimatedModal
        open={cropOpen}
        onClose={() => {
          if (uploading) return;
          setCropOpen(false);
          resetCropState();
        }}
        maxWidthClassName="max-w-lg"
      >
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold">Crop to square</h3>
          <p className="mt-1 text-sm text-fg-muted">Adjust the square. Result must be 1:1.</p>
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
        </div>
      </AnimatedModal>
    </div>
  );
}
