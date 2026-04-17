import { useState } from 'react';
import FormField from '@/shared/components/ui/form-field/FormField';
import Button from '@/shared/components/ui/button/Button';
import AvatarOrUrlEditor from '@/shared/components/media/AvatarOrUrlEditor';
import { useProfile, useUpdateProfile } from '../hooks/useAccount';
import { normalizeAccountProfile } from '../account-mapper';
import { useAuth } from '@/features/auth/hooks/useAuth';

function privacyField(label, name, checked, onChange) {
  return (
    <div
      key={name}
      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3"
    >
      <span className="text-sm text-fg/85">{label}</span>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 shrink-0 cursor-pointer accent-rydo-purple rounded"
      />
    </div>
  );
}

export function ProfileEditForm() {
  const { data: profile, isLoading } = useProfile();
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();
  const { updateUser } = useAuth();
  const [draft, setDraft] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const base = draft || profile;
  const p = base?.privacy;

  const formData =
    base ||
    (profile
      ? { ...profile }
      : {
          firstName: '',
          lastName: '',
          email: '',
          bio: '',
          location: '',
          avatarUrl: '',
          privacy: {
            publicFirstName: true,
            publicLastName: true,
            publicEmail: false,
            publicCreatedAt: true,
            publicBio: true,
            publicLocation: true,
            publicAvatarUrl: true,
            publicDefaultBikeType: true,
          },
        });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSuccessMsg('');
    setDraft((prev) => {
      const cur = prev || profile;
      if (!cur) return prev;
      if (name.startsWith('privacy.')) {
        const key = name.slice('privacy.'.length);
        return {
          ...cur,
          privacy: { ...cur.privacy, [key]: checked },
        };
      }
      return {
        ...cur,
        [name]: type === 'checkbox' ? checked : value,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    const cur = draft || profile;
    if (!cur?.privacy) return;
    try {
      const payload = {
        firstName: (cur.firstName || '').trim(),
        lastName: (cur.lastName || '').trim(),
        email: (cur.email || '').trim(),
        bio: cur.bio?.trim() || '',
        location: cur.location?.trim() || '',
        avatarUrl: cur.avatarUrl?.trim() || '',
        publicFirstName: cur.privacy.publicFirstName,
        publicLastName: cur.privacy.publicLastName,
        publicEmail: cur.privacy.publicEmail,
        publicCreatedAt: cur.privacy.publicCreatedAt,
        publicBio: cur.privacy.publicBio,
        publicLocation: cur.privacy.publicLocation,
        publicAvatarUrl: cur.privacy.publicAvatarUrl,
        publicDefaultBikeType: cur.privacy.publicDefaultBikeType,
      };
      const raw = await updateProfile(payload);
      const normalized = normalizeAccountProfile(raw);
      updateUser({
        id: normalized.id,
        fullName: normalized.fullName,
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        email: normalized.email,
        avatarUrl: normalized.avatarUrl || null,
        role: normalized.role,
        isActive: normalized.isActive,
        createdAt: normalized.createdAt,
      });
      setDraft(null);
      setSuccessMsg('Profile saved.');
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  if (isLoading || !profile) {
    return <div className="text-fg-muted">Loading profile…</div>;
  }

  const privacy = p || formData.privacy;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
      <div className="space-y-4">
        <FormField label="First name">
          <input
            name="firstName"
            value={formData.firstName ?? ''}
            onChange={handleChange}
            autoComplete="given-name"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-fg placeholder:text-fg-subtle focus:border-rydo-purple focus:outline-none focus:ring-1 focus:ring-rydo-purple"
          />
        </FormField>
        <FormField label="Last name">
          <input
            name="lastName"
            value={formData.lastName ?? ''}
            onChange={handleChange}
            autoComplete="family-name"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-fg placeholder:text-fg-subtle focus:border-rydo-purple focus:outline-none focus:ring-1 focus:ring-rydo-purple"
          />
        </FormField>
        <FormField label="Email">
          <input
            name="email"
            type="email"
            value={formData.email ?? ''}
            onChange={handleChange}
            autoComplete="email"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-fg placeholder:text-fg-subtle focus:border-rydo-purple focus:outline-none focus:ring-1 focus:ring-rydo-purple"
          />
        </FormField>
        <FormField label="Bio">
          <textarea
            name="bio"
            value={formData.bio ?? ''}
            onChange={handleChange}
            rows={4}
            className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-fg placeholder:text-fg-subtle focus:border-rydo-purple focus:outline-none focus:ring-1 focus:ring-rydo-purple"
          />
        </FormField>
        <FormField label="Location">
          <input
            name="location"
            value={formData.location ?? ''}
            onChange={handleChange}
            autoComplete="off"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-fg placeholder:text-fg-subtle focus:border-rydo-purple focus:outline-none focus:ring-1 focus:ring-rydo-purple"
          />
        </FormField>
        <FormField label="Profile photo">
          <AvatarOrUrlEditor
            kind="user"
            displayName={`${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'You'}
            avatarUrl={formData.avatarUrl ?? ''}
            onAvatarUrlChange={(v) => {
              setSuccessMsg('');
              setDraft((prev) => {
                const cur = prev || profile;
                if (!cur) return prev;
                return { ...cur, avatarUrl: v };
              });
            }}
          />
        </FormField>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-fg-subtle">Visible on public profile</p>
        <p className="text-sm text-fg-muted mb-3">
          Other signed-in members only see fields you enable below.
        </p>
        <div className="space-y-2">
          {privacyField('First name', 'privacy.publicFirstName', privacy.publicFirstName, handleChange)}
          {privacyField('Last name', 'privacy.publicLastName', privacy.publicLastName, handleChange)}
          {privacyField('Email', 'privacy.publicEmail', privacy.publicEmail, handleChange)}
          {privacyField('Member since', 'privacy.publicCreatedAt', privacy.publicCreatedAt, handleChange)}
          {privacyField('Bio', 'privacy.publicBio', privacy.publicBio, handleChange)}
          {privacyField('Location', 'privacy.publicLocation', privacy.publicLocation, handleChange)}
          {privacyField('Avatar', 'privacy.publicAvatarUrl', privacy.publicAvatarUrl, handleChange)}
          {privacyField('Default bike type', 'privacy.publicDefaultBikeType', privacy.publicDefaultBikeType, handleChange)}
        </div>
      </div>

      {successMsg ? <p className="text-sm text-rydo-green/90">{successMsg}</p> : null}

      <Button type="submit" variant="primary" className="w-full" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}
