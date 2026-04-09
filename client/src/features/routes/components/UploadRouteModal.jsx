import { useState, lazy, Suspense } from 'react';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import { useUploadRoute } from '@/features/routes/api/routesApi';

const RouteMapPreview = lazy(() => import('./RouteMapPreview'));

const DIFFICULTY_OPTIONS = ['casual', 'moderate', 'hard'];
const SOIL_TYPE_OPTIONS = ['rocky', 'loam', 'clay', 'sandy'];

export default function UploadRouteModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1); // 1: upload, 2: preview + metadata
    const [file, setFile] = useState(null);
    const [geoJson, setGeoJson] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form metadata
    const [formData, setFormData] = useState({
        name: '',
        difficulty: 'moderate',
        soilType: 'loam',
        durationMinutes: 60,
        description: '',
    });

    const { mutateAsync: uploadRoute } = useUploadRoute();

    if (!isOpen) return null;

    const handleFileSelect = async (e) => {
        const selected = e.target.files[0];
        if (!selected) return;

        setFile(selected);
        setError(null);
        setLoading(true);

        try {
            // Parse GPX client-side
            const text = await selected.text();
            const parser = new DOMParser();
            const gpxDom = parser.parseFromString(text, 'application/xml');

            if (gpxDom.getElementsByTagName('parsererror').length > 0) {
                throw new Error('Invalid GPX file');
            }

            // Convert GPX to GeoJSON
            const toGeoJSON = await import('togeojson');
            const geojson = toGeoJSON.gpx(gpxDom);
            setGeoJson(geojson);

            // Calculate stats from geojson coordinates
            const coords = geojson.features?.[0]?.geometry?.coordinates || [];
            const distance = calculateDistance(coords);
            const elevation = calculateElevation(gpxDom);

            setStats({
                distanceKm: (distance / 1000).toFixed(2),
                elevationGainM: elevation.toFixed(0),
            });

            setStep(2); // Move to preview/metadata
        } catch (err) {
            setError(err.message || 'Failed to parse GPX file');
            setFile(null);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!file || !formData.name) {
            setError('Name is required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await uploadRoute({
                file,
                Name: formData.name,
                Difficulty: formData.difficulty,
                SoilType: formData.soilType,
                DurationMinutes: formData.durationMinutes,
                Description: formData.description,
            });

            onSuccess?.(response);
            // Reset state
            setStep(1);
            setFile(null);
            setGeoJson(null);
            setStats(null);
            setFormData({
                name: '',
                difficulty: 'moderate',
                soilType: 'loam',
                durationMinutes: 60,
                description: '',
            });
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save route');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        // Reset state when closing
        setStep(1);
        setFile(null);
        setGeoJson(null);
        setStats(null);
        setError(null);
        setFormData({
            name: '',
            difficulty: 'moderate',
            soilType: 'loam',
            durationMinutes: 60,
            description: '',
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-6 p-8">
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-2xl font-semibold">Upload GPX Route</h2>
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="text-white/60 hover:text-white transition"
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
                                className="block w-full text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#7B5CFF]/30 file:text-[#7B5CFF] hover:file:bg-[#7B5CFF]/40"
                            />
                        </label>
                    </div>
                )}

                {step === 2 && geoJson && stats && (
                    <div className="space-y-6">
                        <Suspense fallback={<div className="h-64 mb-4 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 text-white/40">Loading Map...</div>}>
                            <RouteMapPreview geoJson={geoJson} />
                        </Suspense>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                                <p className="text-xs uppercase tracking-widest text-white/42">Distance</p>
                                <p className="mt-2 text-2xl font-semibold">{stats.distanceKm} km</p>
                            </div>
                            <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                                <p className="text-xs uppercase tracking-widest text-white/42">Elevation</p>
                                <p className="mt-2 text-2xl font-semibold">{stats.elevationGainM} m</p>
                            </div>
                            <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                                <p className="text-xs uppercase tracking-widest text-white/42">Duration</p>
                                <p className="mt-2 text-2xl font-semibold">{formData.durationMinutes} min</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Route Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    placeholder="e.g., Oak Ridge Loop"
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#7B5CFF]/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">Duration (minutes) *</label>
                                <input
                                    type="number"
                                    value={formData.durationMinutes}
                                    onChange={(e) => handleInputChange('durationMinutes', parseInt(e.target.value) || 0)}
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#7B5CFF]/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">Difficulty *</label>
                                <select
                                    value={formData.difficulty}
                                    onChange={(e) => handleInputChange('difficulty', e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:border-[#7B5CFF]/50"
                                >
                                    {DIFFICULTY_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">Soil Type *</label>
                                <select
                                    value={formData.soilType}
                                    onChange={(e) => handleInputChange('soilType', e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:border-[#7B5CFF]/50"
                                >
                                    {SOIL_TYPE_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder="Add notes about the route..."
                                    rows="3"
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#7B5CFF]/50"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-3 justify-end pt-4">
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
        </div>
    );
}

function calculateDistance(coords) {
    let distance = 0;
    for (let i = 0; i < coords.length - 1; i++) {
        distance += haversineDistance(
            coords[i][1], coords[i][0],
            coords[i + 1][1], coords[i + 1][0]
        );
    }
    return distance;
}

function calculateElevation(gpxDom) {
    // Extract elevation data from GPX xml
    const ns = 'http://www.topografix.com/GPX/1/1';
    const trkpts = Array.from(gpxDom.getElementsByTagNameNS(ns, 'trkpt'));

    let elevGain = 0;
    let prevEle = null;

    trkpts.forEach(pt => {
        const eleElem = pt.getElementsByTagNameNS(ns, 'ele')[0];
        if (eleElem) {
            const ele = parseFloat(eleElem.textContent);
            if (prevEle !== null && ele > prevEle) {
                elevGain += ele - prevEle;
            }
            prevEle = ele;
        }
    });

    return elevGain;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
