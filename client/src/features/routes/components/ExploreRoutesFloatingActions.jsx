import { Route as RouteIcon, Plus } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import GradientCTA from '@/shared/components/bold/GradientCTA';
import MobileChromeSecondaryButton from '@/shared/components/layout/mobile-chrome/MobileChromeSecondaryButton';
import MobileFloatingActions from '@/shared/components/layout/mobile-chrome/MobileFloatingActions';
import { cn } from '@/shared/lib/cn';

/** Mobile Explore — My Routes + Add route in the bottom chrome stack. */
export default function ExploreRoutesFloatingActions({ onAddRoute, className }) {
  return (
    <MobileFloatingActions className={cn('md:hidden', className)}>
      <MobileChromeSecondaryButton to={ROUTES.myRoutes} className="min-w-0 flex-1">
        <RouteIcon className="h-[17px] w-[17px] shrink-0 text-rydo-purple" strokeWidth={2.2} aria-hidden />
        My Routes
      </MobileChromeSecondaryButton>
      <GradientCTA
        type="button"
        icon={Plus}
        heightClass="h-12"
        className="min-w-0 flex-1 px-3 text-sm shadow-[0_8px_28px_color-mix(in_srgb,var(--rydo-green)_45%,transparent)]"
        onClick={onAddRoute}
      >
        Add route
      </GradientCTA>
    </MobileFloatingActions>
  );
}
