import { Suspense } from 'react';
import { useOutlet, useLocation, useNavigation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { LiveRideBootModuleFallback } from '@/features/live-ride/components/LiveRideBootOverlay';
import { env } from '@/shared/config/env';

const MotionDiv = motion.div;

const RIDE_LIVE_MAP_PATH = /^\/ride\/[^/]+\/live$/;
const EASE = [0.25, 0.1, 0.25, 1];

function RouteTransitionFallback() {
  return (
    <div
      className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-4 rounded-2xl bg-surface px-6 py-12"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="h-8 w-8 rounded-full border-2 border-border-strong border-t-rydo-purple animate-spin" />
      <p className="text-sm text-fg-subtle">Loading…</p>
    </div>
  );
}

/**
 * Single `useOutlet()` + keyed motion (not multiple `<Outlet />`), so exit/enter animations
 * see the correct route elements. Prefetch (see layouts) keeps lazy chunks warm so transitions
 * aren’t skipped behind a long network wait.
 *
 * Native (Capacitor): instant route swap — no AnimatePresence.
 * Web: sequential fade/slide via AnimatePresence mode="wait".
 */
export default function AnimatedOutlet() {
  const outlet = useOutlet();
  const location = useLocation();
  const navigation = useNavigation();
  const reducedMotion = useReducedMotion();

  // Pathname only: same route with different query (e.g. `?tab=` on settings) must not remount
  // the outlet wrapper — otherwise AnimatePresence runs exit→enter and opacity flashes to 0.
  const routeKey = location.pathname;
  const isLoadingRoute = navigation.state === 'loading';
  const isRideLiveMap = RIDE_LIVE_MAP_PATH.test(routeKey);
  const skipMotion = reducedMotion || isRideLiveMap || env.isNativeApp;

  const duration = reducedMotion ? 0.1 : 0.22;
  const outletShellClass = 'flex min-h-0 min-w-0 flex-1 flex-col max-md:h-full';

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col max-md:h-full">
      {isLoadingRoute ? (
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-0.5 rounded-full bg-rydo-purple/35 animate-pulse"
          aria-hidden
        />
      ) : null}

      {skipMotion ? (
        <div className={outletShellClass}>
          <Suspense
            fallback={isRideLiveMap ? <LiveRideBootModuleFallback /> : <RouteTransitionFallback />}
          >
            {outlet}
          </Suspense>
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <MotionDiv
            key={routeKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration, ease: EASE }}
            className={outletShellClass}
          >
            <Suspense fallback={<RouteTransitionFallback />}>{outlet}</Suspense>
          </MotionDiv>
        </AnimatePresence>
      )}
    </div>
  );
}
