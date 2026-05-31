import { useMemo, useState } from 'react';
import { generatePath, useNavigate, useNavigation, useParams } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import RideEventCard from '@/features/rides/components/RideEventCard';
import RideEventPageBold from '@/features/rides/components/RideEventPageBold';
import EditRideModal from '@/features/rides/components/EditRideModal';
import RideMembersList from '@/features/rides/components/RideMembersList';
import RouteMapWithElevation from '@/features/routes/components/RouteMapWithElevation';
import RouteMetadataPanel from '@/features/routes/components/RouteMetadataPanel';
import { isRideUpcoming, useRideEvent } from '@/features/rides/hooks/useRideEvent';
import { rideEventWindow, isRideInProgress } from '@/features/rides/utils/rideEventWindow';
import { useRideAttendance } from '@/features/rides/hooks/useRideAttendance';
import { useRouteDetails } from '@/features/routes/hooks/useRouteDetails';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Button from '@/shared/components/ui/button/Button';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';
import RideWeatherSummary from '@/features/weather/RideWeatherSummary';
import { usePageBreadcrumbDetail } from '@/shared/context/BreadcrumbContext';
import ShareButton from '@/shared/components/share/ShareButton';
import { MessageCircle } from 'lucide-react';

function prefetchLiveRideRoute() {
  import('@/features/live-ride/LiveRideRoute').catch(() => {});
}

export default function RideEventPage() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [enteringLive, setEnteringLive] = useState(false);
  const { ride, isLoading, isError, error, refetch } = useRideEvent(rideId);

  usePageBreadcrumbDetail(ride?.name);
  const { joinRide, leaveRide, isJoining, isLeaving } = useRideAttendance(rideId);
  const rid = ride?.routeId != null ? String(ride.routeId) : '';
  const { route: linkedRoute, isLoading: routeLoading } = useRouteDetails(rid);

  const geoJson = useMemo(
    () => buildRoutePreviewFeatureCollection(linkedRoute?.preview ?? null),
    [linkedRoute],
  );

  const myUserId = user?.id != null ? Number(user.id) : null;
  const amParticipant = useMemo(() => {
    if (myUserId == null || !ride) return false;
    if (Array.isArray(ride.participants) && ride.participants.length > 0) {
      return ride.participants.map(Number).includes(myUserId);
    }
    if (Array.isArray(ride.participantDetails)) {
      return ride.participantDetails.some((p) => Number(p.userId) === myUserId);
    }
    return false;
  }, [myUserId, ride]);

  const liveRideTarget =
    ride?.id != null ? ROUTES.rideLive.replace(':rideId', String(ride.id)) : null;
  const isNavigatingToLive =
    enteringLive &&
    navigation.state === 'loading' &&
    navigation.location?.pathname === liveRideTarget;

  const loadError =
    error?.status === 404
      ? 'This ride was not found or is not visible with your account.'
      : error?.message || 'Could not load this ride.';

  const upcoming = ride ? isRideUpcoming(ride) : false;
  const eventWindow = ride ? rideEventWindow(ride) : null;
  const liveAvailable = Boolean(eventWindow?.liveAvailable);
  const eventOpen = Boolean(eventWindow?.isOpen);
  const inProgress = ride ? isRideInProgress(ride) : false;
  const showEdit = Boolean(ride?.viewerCanEdit);

  const sharePath =
    ride?.id != null ? generatePath(ROUTES.rideEvent, { rideId: String(ride.id) }) : null;

  const rideHeaderExtra = (
    <>
      <ShareButton
        path={sharePath}
        title={ride?.name || 'Ride'}
        modalTitle="Share ride"
        className="shrink-0"
      />
      {amParticipant && ride?.rideKind !== 'soloLog' ? (
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            aria-label="Ride chat"
            onClick={() =>
              navigate(generatePath(ROUTES.chatRideThread, { rideId: String(ride.id) }))
            }
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Chat
          </Button>
        ) : null}
      {user && ride?.rideKind !== 'soloLog' && eventOpen ? (
      <>
        {amParticipant && ride.routeId && liveAvailable ? (
          <Button
            type="button"
            variant="neon"
            className="shrink-0"
            disabled={isNavigatingToLive}
            onMouseEnter={prefetchLiveRideRoute}
            onFocus={prefetchLiveRideRoute}
            onClick={() => {
              setEnteringLive(true);
              navigate(liveRideTarget);
            }}
          >
            {isNavigatingToLive ? 'Starting…' : 'Live Ride'}
          </Button>
        ) : null}
        {amParticipant ? (
          <Button variant="secondary" type="button" className="shrink-0" onClick={() => leaveRide()} disabled={isLeaving}>
            {isLeaving ? 'Leaving…' : 'Leave ride'}
          </Button>
        ) : (
          <Button variant="primary" type="button" className="shrink-0" onClick={() => joinRide()} disabled={isJoining}>
            {isJoining ? 'Joining…' : 'Join ride'}
          </Button>
        )}
      </>
      ) : null}
    </>
  );

  const handleLiveRide =
    liveRideTarget && liveAvailable
      ? () => {
          setEnteringLive(true);
          navigate(liveRideTarget);
        }
      : undefined;

  return (
    <>
      <section className="hidden min-w-0 space-y-6 md:block">
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-3xl bg-surface-strong" />
        ) : isError || !ride ? (
          <div className="space-y-4">
            <p className="text-red-400">{loadError}</p>
            <Button variant="secondary" type="button" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <RideEventCard
              ride={ride}
              showEdit={showEdit}
              onEditClick={() => setEditOpen(true)}
              headerExtra={rideHeaderExtra}
            />
            {ride.routeId ? (
              <div className="space-y-4">
                <RouteMapWithElevation
                  geoJson={geoJson}
                  layout="split"
                  splitTriplePreset={upcoming ? 'mapHalf' : 'default'}
                  splitTrailing={
                    upcoming ? (
                      <RideWeatherSummary
                        key={`${ride.id}-ride-weather`}
                        ride={ride}
                        linkedRoute={linkedRoute}
                        routeLoading={routeLoading}
                        layout="split"
                      />
                    ) : null
                  }
                />
                <RouteMetadataPanel route={linkedRoute} />
              </div>
            ) : (
              <p className="text-sm text-fg-muted">No route is linked to this event yet.</p>
            )}
            {!user && ride.rideKind !== 'soloLog' && upcoming ? (
              <p className="text-sm text-fg-muted">Sign in to join this ride.</p>
            ) : null}
            <RideMembersList members={ride.participantDetails} participantCount={ride.participantCount ?? 0} />
          </>
        )}
        {ride ? <EditRideModal open={editOpen} onClose={() => setEditOpen(false)} ride={ride} /> : null}
      </section>

      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <RideEventPageBold
          ride={ride}
          geoJson={geoJson}
          linkedRoute={linkedRoute}
          routeLoading={routeLoading}
          upcoming={upcoming}
          inProgress={inProgress}
          eventOpen={eventOpen}
          liveAvailable={liveAvailable}
          showEdit={showEdit}
          onEditClick={() => setEditOpen(true)}
          user={user}
          amParticipant={amParticipant}
          onJoin={() => joinRide()}
          onLeave={() => leaveRide()}
          isJoining={isJoining}
          isLeaving={isLeaving}
          onLiveRide={amParticipant && ride?.routeId && liveAvailable ? handleLiveRide : undefined}
          isNavigatingToLive={isNavigatingToLive}
          onPrefetchLive={prefetchLiveRideRoute}
          isLoading={isLoading}
          isError={isError || !ride}
          errorMessage={loadError}
          onRetry={() => refetch()}
        />
        {ride ? <EditRideModal open={editOpen} onClose={() => setEditOpen(false)} ride={ride} /> : null}
      </div>
    </>
  );
}
