import { useRef } from 'react';
import { cn } from '@/shared/lib/cn';
import { MOBILE_CTA_SLOT_ID } from '@/shared/components/layout/mobile-chrome/MobileBottomChromeContext';
import { useMobileBottomStackInset } from '@/shared/components/layout/mobile-chrome/useMobileBottomStackInset';

/**
 * Fixed bottom stack: CTA portal slot → optional mode bar → tab bar.
 * Height is measured into --rydo-bottom-stack-h for scroll insets.
 */
export default function MobileBottomChrome({
  modeBar = null,
  tabs,
  className,
  ariaLabel = 'Main',
}) {
  const stackRef = useRef(null);
  useMobileBottomStackInset(stackRef);

  return (
    <div
      ref={stackRef}
      className={cn(
        'fixed inset-x-0 bottom-0 z-(--rydo-z-tabbar) flex flex-col md:hidden',
        className,
      )}
    >
      <div id={MOBILE_CTA_SLOT_ID} className="rydo-mobile-cta-slot shrink-0 empty:hidden" />
      {modeBar}
      <nav className="rydo-bold-tabbar flex w-full shrink-0 border-t-0" aria-label={ariaLabel}>
        {tabs}
      </nav>
    </div>
  );
}
