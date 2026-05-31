import { Link } from 'react-router-dom';
import { Route as RouteIcon, Plus } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import GradientCTA from '@/shared/components/bold/GradientCTA';
import { cn } from '@/shared/lib/cn';

/** Mobile Explore — My Routes + Add route above the tab bar. */
export default function ExploreRoutesFloatingActions({ onAddRoute, className }) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-(--rydo-z-chat-fab) flex px-5 md:hidden',
        'bottom-[calc(var(--rydo-tabbar-h)+0.75rem)]',
        className,
      )}
    >
      <div className="pointer-events-auto flex w-full flex-row items-stretch gap-2.5">
        <Link
          to={ROUTES.myRoutes}
          className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_88%,transparent)] px-3 text-sm font-semibold text-fg shadow-lg backdrop-blur-md transition hover:border-border-strong hover:bg-surface"
        >
          <RouteIcon className="h-[17px] w-[17px] shrink-0 text-rydo-purple" strokeWidth={2.2} aria-hidden />
          My Routes
        </Link>
        <GradientCTA
          type="button"
          icon={Plus}
          heightClass="h-11"
          className="min-w-0 flex-1 px-3 text-sm shadow-[0_8px_28px_color-mix(in_srgb,var(--rydo-green)_45%,transparent)]"
          onClick={onAddRoute}
        >
          Add route
        </GradientCTA>
      </div>
    </div>
  );
}
