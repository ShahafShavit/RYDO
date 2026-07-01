import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { cn } from '@/shared/lib/cn';

/**
 * @param {{ variant?: 'default' | 'bold' }} props
 */
export default function SettingsDangerZone({ variant = 'default' }) {
  const isBold = variant === 'bold';

  return (
    <section
      className={cn(
        'rounded-2xl border border-[#FF5C5C]/25 bg-[#FF5C5C]/5 p-5',
        isBold && 'mx-0',
      )}
      aria-labelledby="settings-danger-zone-heading"
    >
      <h2
        id="settings-danger-zone-heading"
        className="text-sm font-semibold uppercase tracking-[0.12em] text-[#FF5C5C]"
      >
        Danger zone
      </h2>
      <p className="mt-2 text-sm text-fg-muted leading-relaxed">
        Permanently delete your RYDO account and associated personal data. This cannot be undone.
        Request deletion by email using the steps on our account deletion page.
      </p>
      <Link
        to={ROUTES.deleteAccount}
        className={cn(
          'mt-4 inline-flex items-center justify-center rounded-2xl border border-[#FF5C5C]/35 px-4 py-2.5 text-sm font-semibold text-[#FF5C5C] transition hover:bg-[#FF5C5C]/10',
          isBold && 'w-full',
        )}
      >
        Delete account
      </Link>
    </section>
  );
}
