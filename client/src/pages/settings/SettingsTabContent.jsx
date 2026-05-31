import Card from '@/shared/components/ui/card/Card';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import { ChangePasswordForm } from '@/features/account/components/ChangePasswordForm';
import { RidingPreferencesForm } from '@/features/account/components/RidingPreferencesForm';
import { ProfileEditForm } from '@/features/account/components/ProfileEditForm';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUserProfile } from '@/features/users/hooks/useUserProfile';
import { UserProfilePublicCard } from '@/features/users/components/UserProfilePublicCard';
import { projectProfileAsSeenByOthers } from '@/features/account/account-mapper';
import { useMemo } from 'react';
import { cn } from '@/shared/lib/cn';

function ProfileTabPublicPreview({ bold }) {
  const { user } = useAuth();
  const userId = user?.id != null ? String(user.id) : '';

  const { data: profile, isLoading, isError } = useUserProfile(userId || undefined);

  const cardProfile = useMemo(
    () => (profile ? projectProfileAsSeenByOthers(profile) : null),
    [profile],
  );

  const statusClass = bold ? 'rydo-subtle text-sm' : 'text-center text-fg-muted sm:text-left';

  if (!user) {
    return <p className={statusClass}>Sign in to manage your profile.</p>;
  }
  if (!userId) {
    return null;
  }
  if (isLoading) {
    return <p className={statusClass}>Loading your public profile…</p>;
  }
  if (isError || !profile || !cardProfile) {
    return <p className={statusClass}>Could not load your public profile preview.</p>;
  }

  return (
    <UserProfilePublicCard
      profile={cardProfile}
      userId={userId}
      ownerEmptyHint="You have not shared any public profile details yet. Turn on visibility under Edit details, and choose what to show in Preferences below."
      className={bold ? '!border-0 !bg-transparent !p-0 shadow-none' : undefined}
    />
  );
}

function SettingsSection({ eyebrow, children, bold }) {
  if (bold) {
    return (
      <div>
        <Eyebrow className="mb-2.5 ml-0.5 block">{eyebrow}</Eyebrow>
        <div className="rydo-panel px-4 py-4">{children}</div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">{eyebrow}</p>
      <Card className="flex-1 sm:p-8">
        <div className="flex flex-col items-center">{children}</div>
      </Card>
    </div>
  );
}

export default function SettingsTabContent({ activeTab, variant = 'default' }) {
  const bold = variant === 'bold';

  if (activeTab === 'profile') {
    return (
      <div className={cn('flex w-full flex-col', bold ? 'gap-4' : 'mx-auto max-w-4xl gap-8')}>
        <div>
          {bold ? (
            <Eyebrow className="mb-2.5 ml-0.5 block">How others see you</Eyebrow>
          ) : (
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">
              How others see your profile
            </p>
          )}
          {bold ? (
            <div className="rydo-panel overflow-hidden p-0">
              <ProfileTabPublicPreview bold />
            </div>
          ) : (
            <ProfileTabPublicPreview />
          )}
        </div>

        <SettingsSection eyebrow="Edit details" bold={bold}>
          <ProfileEditForm />
        </SettingsSection>

        <SettingsSection eyebrow="Preferences" bold={bold}>
          <RidingPreferencesForm />
        </SettingsSection>
      </div>
    );
  }

  if (bold) {
    return (
      <div>
        <Eyebrow className="mb-2.5 ml-0.5 block">Security</Eyebrow>
        <div className="rydo-panel px-4 py-4">
          <ChangePasswordForm />
        </div>
      </div>
    );
  }

  return (
    <Card className="flex-1 sm:p-8">
      <div className="flex h-full flex-col items-center">
        <div className="flex w-full justify-center">
          <ChangePasswordForm />
        </div>
      </div>
    </Card>
  );
}
