import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, MapPin, Compass } from 'lucide-react';
import Button from '@/shared/components/ui/button/Button';
import {
  LIVE_RIDE_BOOT_MILESTONES,
  liveRideBootProgress,
} from '@/features/live-ride/liveRideBootMilestones';
import { isOrientationPermissionRequired } from '@/features/live-ride/utils/requestLiveRidePermissions';

/**
 * @param {object} props
 * @param {string | undefined} props.rideName
 * @param {Record<import('@/features/live-ride/liveRideBootMilestones').LiveRideBootMilestoneId, boolean>} props.milestones
 * @param {string} props.label
 * @param {boolean} props.bootBlocked
 * @param {string | undefined} props.blockingReason
 * @param {boolean} props.needsLocationAction
 * @param {boolean} props.needsOrientationAction
 * @param {boolean} props.permissionRequestInFlight
 * @param {() => void} [props.onRequestLocation]
 * @param {() => void} [props.onRequestOrientation]
 * @param {() => void} [props.onRetry]
 * @param {string | undefined} props.backTo
 * @param {string | undefined} props.fatalError
 * @param {boolean} [props.fadingOut]
 * @param {boolean} [props.moduleOnly]
 */
export default function LiveRideBootOverlay({
  rideName,
  milestones,
  label,
  bootBlocked,
  blockingReason,
  needsLocationAction,
  needsOrientationAction,
  permissionRequestInFlight,
  onRequestLocation,
  onRequestOrientation,
  onRetry,
  backTo,
  fatalError,
  fadingOut = false,
  moduleOnly = false,
}) {
  const progress = liveRideBootProgress(milestones);
  const orientationRequired = isOrientationPermissionRequired();
  const showChecklist = !moduleOnly && !fatalError && !bootBlocked;

  return (
    <div
      className={`fixed inset-0 z-(--rydo-z-live-blocking) flex flex-col items-center justify-center bg-[#0a0908] px-6 text-center text-fg transition-opacity duration-300 ${
        fadingOut ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-busy={!bootBlocked && !fatalError}
      aria-label="Loading live ride"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">Live ride</p>
          {rideName ? <h1 className="text-lg font-semibold tracking-tight">{rideName}</h1> : null}
        </div>

        {fatalError ? (
          <div className="space-y-4">
            <p className="text-sm text-red-400">{fatalError}</p>
            {backTo ? (
              <Link
                to={backTo}
                className="inline-block text-sm text-rydo-purple underline-offset-4 hover:underline"
              >
                Back
              </Link>
            ) : null}
          </div>
        ) : bootBlocked ? (
          <div className="space-y-4">
            <p className="text-sm text-fg-muted">{blockingReason || 'Required permissions were not granted.'}</p>
            <p className="text-xs text-fg-subtle">
              Live ride needs your location{orientationRequired ? ' and device orientation' : ''} to show your position
              on the map.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {onRetry ? (
                <Button type="button" variant="primary" onClick={onRetry}>
                  Retry
                </Button>
              ) : null}
              {backTo ? (
                <Link to={backTo}>
                  <Button type="button" variant="secondary">
                    Back
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-fg-muted">
              {permissionRequestInFlight ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-rydo-purple" aria-hidden />
              )}
              <span>{label}</span>
            </div>

            <div className="w-full space-y-2">
              <div
                className="h-2 overflow-hidden rounded-full bg-surface-strong"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label="Live ride loading progress"
              >
                <div
                  className="h-full rounded-full bg-rydo-purple transition-[width] duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs tabular-nums text-fg-subtle">{progress}%</p>
            </div>

            {(needsLocationAction || needsOrientationAction) && (
              <div className="w-full space-y-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-left">
                <p className="text-sm text-fg-muted">
                  Allow the permissions below to join the live map. You cannot enter live ride without them.
                </p>
                {needsLocationAction && onRequestLocation ? (
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full justify-center gap-2"
                    disabled={permissionRequestInFlight}
                    onClick={onRequestLocation}
                  >
                    <MapPin className="h-4 w-4" aria-hidden />
                    Allow location
                  </Button>
                ) : null}
                {needsOrientationAction && onRequestOrientation ? (
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full justify-center gap-2"
                    disabled={permissionRequestInFlight}
                    onClick={onRequestOrientation}
                  >
                    <Compass className="h-4 w-4" aria-hidden />
                    Allow motion &amp; orientation
                  </Button>
                ) : null}
              </div>
            )}

            {showChecklist ? (
              <ul className="w-full space-y-1.5 text-left text-xs text-fg-subtle">
                {Object.entries(LIVE_RIDE_BOOT_MILESTONES).map(([id, { label: stepLabel }]) => {
                  const done = milestones[id];
                  return (
                    <li key={id} className="flex items-center gap-2">
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                      ) : (
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border-strong" aria-hidden />
                      )}
                      <span className={done ? 'text-fg-muted' : ''}>{stepLabel}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Minimal overlay for Suspense / module chunk loading (before RideLiveMapPage mounts).
 */
export function LiveRideBootModuleFallback() {
  return (
    <LiveRideBootOverlay
      milestones={{
        module: false,
        ride: false,
        permissions: false,
        map: false,
        location: false,
        camera: false,
      }}
      label={LIVE_RIDE_BOOT_MILESTONES.module.label}
      bootBlocked={false}
      needsLocationAction={false}
      needsOrientationAction={false}
      permissionRequestInFlight={false}
      moduleOnly
    />
  );
}
