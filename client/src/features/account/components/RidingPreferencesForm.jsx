import { useState, useEffect } from 'react';
import FormField from '@/shared/components/ui/form-field/FormField';
import Button from '@/shared/components/ui/button/Button';
import { usePreferences, useUpdatePreferences } from '../hooks/useAccount';

export const RidingPreferencesForm = () => {
    const { data: preferences, isLoading } = usePreferences();
    const { mutateAsync: updatePreferences, isLoading: isUpdating } = useUpdatePreferences();

    const [formData, setFormData] = useState({
        defaultBikeType: 'road',
        distanceUnit: 'km',
        notificationsEnabled: true
    });
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        if (preferences) {
            setFormData({
                defaultBikeType: preferences.defaultBikeType || 'road',
                distanceUnit: preferences.distanceUnit || 'km',
                notificationsEnabled: preferences.notificationsEnabled ?? true
            });
        }
    }, [preferences]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        try {
            await updatePreferences(formData);
            setSuccessMsg('Preferences updated successfully');
        } catch (err) {
            console.error('Failed to update preferences:', err);
        }
    };

    if (isLoading) return <div className="text-white/60">Loading preferences...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-md w-full">
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
            </div>

            {successMsg && (
                <div className="text-green-500 text-sm mt-2">{successMsg}</div>
            )}

            <Button type="submit" variant="primary" className="w-full" isLoading={isUpdating}>
                Save Preferences
            </Button>
        </form>
    );
};
