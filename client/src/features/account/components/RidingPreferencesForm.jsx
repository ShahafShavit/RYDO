import { useState } from 'react';
import FormField from '@/shared/components/ui/form-field/FormField';
import Button from '@/shared/components/ui/button/Button';
import LabelWithHelp from '@/shared/components/ui/info-tooltip/LabelWithHelp';
import { helpTooltip } from '@/shared/content/help-tooltips';
import { usePreferences, useUpdatePreferences } from '../hooks/useAccount';
import { ColorSchemePicker } from '@/features/account/components/ColorSchemePicker';
import { BIKE_TYPES } from '@/features/account/constants/bikeTypes';
import { useTheme } from '@/app/providers/theme-context';

function PrivacyToggle({ label, hintKey, name, checked, onChange, compactHints }) {
  const hint = helpTooltip(hintKey);
  return (
    <div className="flex flex-col gap-2 p-4 bg-surface border border-border rounded-xl">
      <div className="flex items-center justify-between gap-3">
        <LabelWithHelp
          className="text-fg text-sm font-medium"
          labelClassName="text-left"
          hint={hint}
          topic={typeof label === 'string' ? label : undefined}
        >
          {label}
        </LabelWithHelp>
        <input
          type="checkbox"
          name={name}
          checked={Boolean(checked)}
          onChange={onChange}
          className="w-5 h-5 accent-rydo-purple rounded cursor-pointer shrink-0"
        />
      </div>
      {!compactHints ? (
        <p className="text-xs text-fg-subtle leading-snug">{hint}</p>
      ) : null}
    </div>
  );
}

export const RidingPreferencesForm = ({ compactHints = false }) => {
    const { data: preferences, isLoading } = usePreferences();
    const { mutateAsync: updatePreferences, isLoading: isUpdating } = useUpdatePreferences();
    const { setColorScheme } = useTheme();
    const [draft, setDraft] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const formData = draft || preferences || {
        defaultBikeType: 'road',
        distanceUnit: 'km',
        notificationsEnabled: true,
        publicInRouteRiderLists: true,
        publicUploadedRoutesOnProfile: true,
        publicParticipatedRidesOnProfile: true,
        publicLifetimeStatsOnProfile: true,
        publicFriendsListOnProfile: true,
        publicInOthersFriendsLists: true,
        colorScheme: 'midnight',
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setDraft(prev => ({
            ...(prev || formData),
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleColorSchemeChange = (schemeId) => {
        setColorScheme(schemeId);
        setDraft((prev) => ({
            ...(prev || formData),
            colorScheme: schemeId,
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

    if (isLoading) return <div className="text-fg-muted">Loading preferences...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-lg">
            <div className="space-y-4">
                <FormField label="Appearance">
                    <ColorSchemePicker
                        value={formData.colorScheme || 'midnight'}
                        onChange={handleColorSchemeChange}
                        disabled={isUpdating}
                    />
                </FormField>

                <FormField label="Default Bike Type">
                    <select
                        name="defaultBikeType"
                        value={formData.defaultBikeType}
                        onChange={handleChange}
                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-fg focus:outline-none focus:border-rydo-purple focus:ring-1 focus:ring-rydo-purple transition-colors"
                    >
                        {BIKE_TYPES.map(({ value, optionLabel }) => (
                            <option
                                key={value}
                                value={value}
                                className="bg-[var(--rydo-bg-deep)]"
                            >
                                {optionLabel}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField label="Distance Unit">
                    <select
                        name="distanceUnit"
                        value={formData.distanceUnit}
                        onChange={handleChange}
                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-fg focus:outline-none focus:border-rydo-purple focus:ring-1 focus:ring-rydo-purple transition-colors"
                    >
                        <option value="km" className="bg-[var(--rydo-bg-deep)]">Kilometers (km)</option>
                        <option value="mi" className="bg-[var(--rydo-bg-deep)]">Miles (mi)</option>
                    </select>
                </FormField>

                <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl">
                    <span className="text-fg text-sm font-medium">Enable Notifications</span>
                    <input
                        type="checkbox"
                        name="notificationsEnabled"
                        checked={formData.notificationsEnabled}
                        onChange={handleChange}
                        className="w-5 h-5 accent-rydo-purple rounded cursor-pointer"
                    />
                </div>

                <PrivacyToggle
                    compactHints={compactHints}
                    label='Show me on "who rode this route"'
                    hintKey="privacyRouteRiders"
                    name="publicInRouteRiderLists"
                    checked={formData.publicInRouteRiderLists}
                    onChange={handleChange}
                />

                <PrivacyToggle
                    compactHints={compactHints}
                    label="Show uploaded routes on my profile"
                    hintKey="privacyUploadedRoutes"
                    name="publicUploadedRoutesOnProfile"
                    checked={formData.publicUploadedRoutesOnProfile}
                    onChange={handleChange}
                />

                <PrivacyToggle
                    compactHints={compactHints}
                    label="Show rides I join on my profile"
                    hintKey="privacyParticipatedRides"
                    name="publicParticipatedRidesOnProfile"
                    checked={formData.publicParticipatedRidesOnProfile}
                    onChange={handleChange}
                />

                <PrivacyToggle
                    compactHints={compactHints}
                    label="Show lifetime ride stats on my profile"
                    hintKey="privacyLifetimeStats"
                    name="publicLifetimeStatsOnProfile"
                    checked={formData.publicLifetimeStatsOnProfile}
                    onChange={handleChange}
                />

                <PrivacyToggle
                    compactHints={compactHints}
                    label="Show friends list on my profile"
                    hintKey="privacyFriendsList"
                    name="publicFriendsListOnProfile"
                    checked={formData.publicFriendsListOnProfile}
                    onChange={handleChange}
                />

                <PrivacyToggle
                    compactHints={compactHints}
                    label="Show me on other members' friends lists"
                    hintKey="privacyOthersFriendsLists"
                    name="publicInOthersFriendsLists"
                    checked={formData.publicInOthersFriendsLists}
                    onChange={handleChange}
                />
            </div>

            {successMsg && (
                <div className="text-success text-sm mt-2">{successMsg}</div>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={isUpdating}>
                {isUpdating ? 'Saving…' : 'Save Preferences'}
            </Button>
        </form>
    );
};
