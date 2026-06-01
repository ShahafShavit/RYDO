import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import { MOBILE_CTA_SLOT_ID } from '@/shared/components/layout/mobile-chrome/MobileBottomChromeContext';

/**
 * Portals mobile CTAs into the bottom chrome stack (above mode bar + tab bar).
 * Do not use position:fixed + bottom offsets in feature code — use this instead.
 */
export default function MobileFloatingActions({ children, className }) {
  const [slot, setSlot] = useState(null);

  useEffect(() => {
    const find = () => document.getElementById(MOBILE_CTA_SLOT_ID);

    setSlot(find());

    const observer = new MutationObserver(() => {
      setSlot(find());
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  if (!slot) return null;

  return createPortal(
    <div className={cn('rydo-mobile-cta-row pointer-events-none w-full', className)}>
      <div className="pointer-events-auto flex w-full min-w-0 items-stretch gap-2.5">{children}</div>
    </div>,
    slot,
  );
}
