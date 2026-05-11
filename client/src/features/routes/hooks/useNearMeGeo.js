import { useState, useCallback } from 'react';

/**
 * Browser geolocation for Explore "near me". Caller applies coords to filter state on success.
 */
export function useNearMeGeo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestPosition = useCallback((onSuccess) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Location is not supported in this browser.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        setError(null);
        onSuccess({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setLoading(false);
        const msg =
          err.code === 1
            ? 'Location permission denied.'
            : err.message || 'Could not read your location.';
        setError(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
    );
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { loading, error, requestPosition, clearError };
}
