import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';

const baseClass =
  'rydo-mobile-chrome-secondary inline-flex h-12 min-w-0 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-black/25 px-4 text-sm font-semibold text-fg transition hover:border-border-strong hover:bg-surface disabled:opacity-50';

/** Secondary pill for mobile bottom chrome action rows (Explore, ride attendance, etc.). */
export default function MobileChromeSecondaryButton({ to, className, children, ...props }) {
  if (to) {
    return (
      <Link to={to} className={cn(baseClass, className)} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={cn(baseClass, className)} {...props}>
      {children}
    </button>
  );
}
