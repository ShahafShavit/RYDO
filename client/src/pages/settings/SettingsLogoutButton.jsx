import { cn } from '@/shared/lib/cn';

export default function SettingsLogoutButton({ onClick, className, icon: Icon }) {
  return (
    <button type="button" onClick={onClick} className={cn('inline-flex items-center', className)}>
      {Icon ? <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden /> : null}
      Log out
    </button>
  );
}
