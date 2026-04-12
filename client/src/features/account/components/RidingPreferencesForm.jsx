import { useState } from 'react';
import FormField from '@/shared/components/ui/form-field/FormField';
import Button from '@/shared/components/ui/button/Button';
import { usePreferences, useUpdatePreferences } from '../hooks/useAccount';

export const RidingPreferencesForm = () => {
    const { data: preferences, isLoading } = usePreferences();
    const { mutateAsync: updatePreferences, isLoading: isUpdating } = useUpdatePreferences();
    const [draft, setDraft] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const formData = draft || preferences || {
        defaultBikeType: 'road',
        distanceUnit: 'km',
        notificationsEnabled: true,
        publicInRouteRiderLists: true,
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setDraft(prev => ({
            ...(prev || formData),
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        try {
            await updatePreferences(formData);
            setDraft(null);
            setSuccessMsg('Preferences updated successfully');
        } catch (err) {
            console.error('Failed to update preferences:', err);
        }
    };

    if (isLoading) return <div className="text-white/60">Loading preferences...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-lg">
            <div className="space-y-4">
                <FormField label="Default Bike Type">
                    <select
                        name="defaultBikeType"
                        value={formData.defaultBikeType}
                        onChange={handleChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rydo-purple focus:ring-1 focus:ring-rydo-purple transition-colors"
                    >
                        <option value="road" className="bg-gray-900">Road Bike</option>
                        <option value="mountain" className="bg-gray-900">Mountain Bike</option>
                        <option value="gravel" className="bg-gray-900">Gravel Bike</option>
                        <option value="hybrid" className="bg-gray-900">Hybrid</option>
                    </select>
                </FormField>

                <FormField label="Distance Unit">
                    <select
                        name="distanceUnit"
                        value={formData.distanceUnit}
                        onChange={handleChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rydo-purple focus:ring-1 focus:ring-rydo-purple transition-colors"
                    >
                        <option value="km" className="bg-gray-900">Kilometers (km)</option>
                        <option value="mi" className="bg-gray-900">Miles (mi)</option>
                    </select>
                </FormField>

                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                    <span className="text-white text-sm font-medium">Enable Notifications</span>
                    <input
                        type="checkbox"
                        name="notificationsEnabled"
                        checked={formData.notificationsEnabled}
                        onChange={handleChange}
                        className="w-5 h-5 accent-rydo-purple rounded cursor-pointer"
                    />
                </div>

                <div className="flex flex-col gap-2 p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-white text-sm font-medium">Show me on &quot;who rode this route&quot;</span>
                        <input
                            type="checkbox"
                            name="publicInRouteRiderLists"
                            checked={Boolean(formData.publicInRouteRiderLists)}
                            onChange={handleChange}
                            className="w-5 h-5 accent-rydo-purple rounded cursor-pointer shrink-0"
                        />
                    </div>
                    <p className="text-xs text-white/45 leading-snug">
                        When off, you still count toward totals, but your name is hidden from the rider list on route pages.
                    </p>
                </div>
            </div>

            {successMsg && (
                <div className="text-green-500 text-sm mt-2">{successMsg}</div>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={isUpdating}>
                {isUpdating ? 'Saving…' : 'Save Preferences'}
            </Button>
        </form>
    );
};
