const WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * @param {{ scheduledDate?: string, time?: string, routeId?: number | null, rideKind?: string, rideEventWindow?: object } | null | undefined} ride
 */
export function rideEventWindow(ride) {
  if (!ride) {
    return {
      closesAt: null,
      hasStarted: false,
      isOpen: false,
      chatWritable: false,
      liveAvailable: false,
      canEditScheduledDate: false,
    };
  }

  if (ride.rideEventWindow && typeof ride.rideEventWindow === 'object') {
    const w = ride.rideEventWindow;
    const chatReadOnly = Boolean(w.chatReadOnly);
    return {
      closesAt: w.closesAt ?? null,
      hasStarted: Boolean(w.hasStarted),
      isOpen: !chatReadOnly,
      chatWritable: !chatReadOnly,
      liveAvailable: Boolean(w.liveAvailable),
      canEditScheduledDate: Boolean(w.canEditScheduledDate),
    };
  }

  const iso = ride.scheduledDate || ride.time;
  const start = iso ? new Date(iso) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return {
      closesAt: null,
      hasStarted: false,
      isOpen: true,
      chatWritable: true,
      liveAvailable: Boolean(ride.routeId) && ride.rideKind !== 'soloLog',
      canEditScheduledDate: true,
    };
  }

  const closesAt = new Date(start.getTime() + WINDOW_MS);
  const now = Date.now();
  const hasStarted = now >= start.getTime();
  const isOpen = now < closesAt.getTime();
  const isScheduled = ride.rideKind !== 'soloLog';

  return {
    closesAt: closesAt.toISOString(),
    hasStarted,
    isOpen,
    chatWritable: isOpen && isScheduled,
    liveAvailable: isOpen && isScheduled && Boolean(ride.routeId),
    canEditScheduledDate: !hasStarted,
  };
}

/** @param {{ scheduledDate?: string, time?: string } | null | undefined} ride */
export function isRideUpcoming(ride) {
  const iso = ride?.scheduledDate || ride?.time;
  if (!iso) return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return true;
  return d.getTime() >= Date.now();
}

/** Ride is in progress (started but still within the 48h window). */
export function isRideInProgress(ride) {
  const w = rideEventWindow(ride);
  return w.hasStarted && w.isOpen;
}
