import { useState, lazy, Suspense, useId } from 'react';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { useUploadRoute } from '@/features/routes/hooks/useUploadRoute';
import { analyzeGpxTrack, SUGGESTED_DURATION_SPEED_KMH } from '@/features/routes/utils/gpxAnalysis';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import { ESTIMATED_DURATION_SOURCE } from '@/features/routes/utils/durationSource';

const RouteMapWithElevation = lazy(() => import('./RouteMapWithElevation'));

const DIFFICULTY_OPTIONS = ['casual', 'moderate', 'hard'];
const TERRAIN_OPTIONS = ['road', 'gravel', 'trail', 'mixed'];

export default function UploadRouteModal({ isOpen, onClose, onSuccess }) {
  const { formatKm } = useFormatDistance();
  const titleId = useId();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [geoJson, setGeoJson] = useState(null);
  const [stats, setStats] = useState(null);
  const [elevationProfile, setElevationProfile] = useState(null);
  const [missingElevation, setMissingElevation] = useState(false);
  // How the duration field was auto-filled: GPX clock times, pace from distance, or fallback.
  const [durationSuggestionSource, setDurationSuggestionSource] = useState(null);
  /** Value suggested at parse time; used to detect user edits for `estimatedDurationSource`. */
  const [suggestedMinutesSnapshot, setSuggestedMinutesSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    difficulty: 'moderate',
    terrain: 'mixed',
    estimatedDurationMinutes: 60,
    description: '',
    region: '',
  });

  const { upload: uploadRoute } = useUploadRoute();

  const handleFileSelect = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setLoading(true);

    try {
      const text = await selected.text();
      const parser = new DOMParser();
      const gpxDom = parser.parseFromString(text, 'application/xml');

      if (gpxDom.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Invalid GPX file');
      }

      const toGeoJSON = await import('togeojson');
      const geojson = toGeoJSON.gpx(gpxDom);
      setGeoJson(geojson);

      const analysis = analyzeGpxTrack(gpxDom);
      if (analysis.error) {
        throw new Error(analysis.error);
      }

      setStats({
        distanceKm: (analysis.distanceM / 1000).toFixed(2),
        elevationGainM: analysis.elevationGainM.toFixed(0),
      });
      setElevationProfile(analysis.elevationProfile);
      setMissingElevation(Boolean(analysis.missingElevation));
      setDurationSuggestionSource(analysis.durationSuggestionSource ?? 'none');
      setSuggestedMinutesSnapshot(analysis.suggestedDurationMinutes ?? 60);
      setFormData((prev) => ({
        ...prev,
        estimatedDurationMinutes: analysis.suggestedDurationMinutes ?? 60,
      }));

      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to parse GPX file');
      setFile(null);
      setGeoJson(null);
      setStats(null);
      setElevationProfile(null);
      setMissingElevation(false);
      setDurationSuggestionSource(null);
      setSuggestedMinutesSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!file || !formData.title) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const curMin = Number(formData.estimatedDurationMinutes);
      const snapMin = suggestedMinutesSnapshot != null ? Number(suggestedMinutesSnapshot) : null;
      const estimatedDurationSource =
        snapMin != null && !Number.isNaN(curMin) && curMin !== snapMin
          ? ESTIMATED_DURATION_SOURCE.USER
          : durationSuggestionSource === 'timestamps'
            ? ESTIMATED_DURATION_SOURCE.GPX_TIMESTAMPS
            : durationSuggestionSource === 'pace'
              ? ESTIMATED_DURATION_SOURCE.ESTIMATED_PACE
              : ESTIMATED_DURATION_SOURCE.ESTIMATED;

      const response = await uploadRoute({
        file,
        title: formData.title,
        difficulty: formData.difficulty,
        terrain: formData.terrain,
        estimatedDurationMinutes: formData.estimatedDurationMinutes,
        estimatedDurationSource,
        description: formData.description,
        region: formData.region,
      });

      onSuccess?.(response);
      setStep(1);
      setFile(null);
      setGeoJson(null);
      setStats(null);
      setElevationProfile(null);
      setMissingElevation(false);
      setDurationSuggestionSource(null);
      setSuggestedMinutesSnapshot(null);
      setFormData({
        title: '',
        difficulty: 'moderate',
        terrain: 'mixed',
        estimatedDurationMinutes: 60,
        description: '',
        region: '',
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save route');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setGeoJson(null);
    setStats(null);
    setElevationProfile(null);
    setMissingElevation(false);
    setDurationSuggestionSource(null);
    setSuggestedMinutesSnapshot(null);
    setError(null);
    setFormData({
      title: '',
      difficulty: 'moderate',
      terrain: 'mixed',
      estimatedDurationMinutes: 60,
      description: '',
      region: '',
    });
    onClose();
  };

  return (
    <AnimatedModal open={isOpen} onClose={handleClose} maxWidthClassName="max-w-2xl">
      <Card className="max-h-[90vh] w-full space-y-6 overflow-y-auto p-8" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-2xl font-semibold">
            Upload GPX Route
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="text-white/60 transition hover:text-white"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {step === 1 && (
          <div>
            <label className="block">
              <p className="mb-3 text-sm font-semibold">Select GPX File</p>
              <input
                type="file"
                accept=".gpx"
                onChange={handleFileSelect}
                disabled={loading}
                className="block w-full text-white/60 file:mr-4 file:rounded-lg file:border-0 file:bg-[#7B5CFF]/30 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#7B5CFF] hover:file:bg-[#7B5CFF]/40"
              />
            </label>
          </div>
        )}

        {step === 2 && geoJson && stats && (
          <div className="space-y-6">
            <Suspense
              fallback={
                <div className="mb-4 flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/40">
                  Loading Map...
                </div>
              }
            >
              <RouteMapWithElevation
                geoJson={geoJson}
                profile={missingElevation ? null : elevationProfile}
              />
            </Suspense>

            {missingElevation ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-100/90">
                No elevation data in this GPX, so we can&apos;t show a profile. Distance below is still from the track.
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-widest text-white/42">Distance</p>
                <p className="mt-2 text-2xl font-semibold">{formatKm(stats.distanceKm, 2)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-widest text-white/42">Elevation gain</p>
                <p className="mt-2 text-2xl font-semibold">{missingElevation ? '—' : `${stats.elevationGainM} m`}</p>
                {!missingElevation ? (
                  <p className="mt-1 text-[11px] text-white/40">Smoothed track, noise filtered</p>
                ) : null}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-widest text-white/42">Duration</p>
                <p className="mt-2 text-2xl font-semibold">{formData.estimatedDurationMinutes} min</p>
                <p className="mt-1 text-[11px] leading-snug text-white/40">
                  {durationSuggestionSource === 'timestamps' &&
                    'Recorded — from GPX clock times (first to last point with times)'}
                  {durationSuggestionSource === 'pace' &&
                    `Inferred at ${SUGGESTED_DURATION_SPEED_KMH} km/h average (no GPX clock)`}
                  {durationSuggestionSource === 'none' &&
                    'Inferred (no GPX clock) — default 60 min until you change it below'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">Route Name *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Oak Ridge Loop"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-[#7B5CFF]/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Duration (minutes) *</label>
                <input
                  type="number"
                  min={1}
                  value={formData.estimatedDurationMinutes}
                  onChange={(e) => handleInputChange('estimatedDurationMinutes', parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-[#7B5CFF]/50 focus:outline-none"
                />
                <p className="mt-2 text-[12px] leading-snug text-white/45">
                  {durationSuggestionSource === 'timestamps' && (
                    <>
                      This matches the GPX recording clock (wall time). Change it only if you want to store a different
                      story than the file&apos;s timestamps.
                    </>
                  )}
                  {durationSuggestionSource === 'pace' && (
                    <>
                      Inferred from track length at{' '}
                      <span className="text-white/70">{SUGGESTED_DURATION_SPEED_KMH} km/h</span> average — no GPX clock
                      in the file. Adjust minutes to match how you ride.
                    </>
                  )}
                  {durationSuggestionSource === 'none' && (
                    <>
                      Inferred (no GPX clock) — we default to 60 minutes; set a value that fits this route.
                    </>
                  )}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Difficulty *</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#7B5CFF]/50 focus:outline-none"
                >
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Terrain *</label>
                <select
                  value={formData.terrain}
                  onChange={(e) => handleInputChange('terrain', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#7B5CFF]/50 focus:outline-none"
                >
                  {TERRAIN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Region</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  placeholder="e.g., Carmel Ridge"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-[#7B5CFF]/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Add notes about the route..."
                  rows="3"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-[#7B5CFF]/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          {step === 1 && (
            <Button variant="primary" disabled={!file || loading}>
              {loading ? 'Parsing...' : 'Next'}
            </Button>
          )}
          {step === 2 && (
            <>
              <Button variant="secondary" onClick={() => setStep(1)} disabled={loading}>
                Back
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Route'}
              </Button>
            </>
          )}
        </div>
      </Card>
    </AnimatedModal>
  );
}
