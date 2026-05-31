import Card from '@/shared/components/ui/card/Card';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import { ChangePasswordForm } from '@/features/account/components/ChangePasswordForm';
import { RidingPreferencesForm } from '@/features/account/components/RidingPreferencesForm';
import { ProfileEditForm } from '@/features/account/components/ProfileEditForm';
import { cn } from '@/shared/lib/cn';

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
        <SettingsSection eyebrow="Edit details" bold={bold}>
          <ProfileEditForm />
        </SettingsSection>

        <SettingsSection eyebrow="Preferences" bold={bold}>
          <RidingPreferencesForm compactHints={bold} />
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
