import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generatePath, useParams, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import RouteDetailsHeader from '@/features/routes/components/RouteDetailsHeader';
import RouteDetailsPageBold from '@/features/routes/components/RouteDetailsPageBold';
import RouteMapWithElevation from '@/features/routes/components/RouteMapWithElevation';
import RouteMetadataPanel from '@/features/routes/components/RouteMetadataPanel';
import { RouteDetailsDescription } from '@/features/routes/components/RouteDescriptionSnippet';
import SavedRouteButton from '@/features/routes/components/SavedRouteButton';
import ScheduleRideFromRouteModal from '@/features/rides/components/ScheduleRideFromRouteModal';
import Button from '@/shared/components/ui/button/Button';
import { useRouteDetails } from '@/features/routes/hooks/useRouteDetails';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';
import RouteWeatherPanel from '@/features/weather/RouteWeatherPanel';
import RouteHazardsPanel from '@/features/hazards/components/RouteHazardsPanel';
import { useRouteHazards } from '@/features/hazards/hooks/useRouteHazards';
import { usePageBreadcrumbDetail } from '@/shared/context/BreadcrumbContext';
import ShareButton from '@/shared/components/share/ShareButton';

export default function RouteDetailsPage() {
  const { routeId } = useParams();
  const [searchParams] = useSearchParams();
  const { route, isLoading: routeLoading } = useRouteDetails(routeId);
  const { hazards, isLoading: hazardsLoading } = useRouteHazards(routeId, {
    enabled: Boolean(route?.id),
  });
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedHazardId, setSelectedHazardId] = useState(null);
  const mapBlockRef = useRef(null);
  const deepLinkHandledRef = useRef(false);

  const hazardIdParam = searchParams.get('hazardId');

  useEffect(() => {
    deepLinkHandledRef.current = false;
  }, [routeId]);

  useEffect(() => {
    if (deepLinkHandledRef.current || hazardsLoading || !hazardIdParam || hazards.length === 0) return;
    const match = hazards.find((h) => String(h.id) === String(hazardIdParam));
    if (!match) return;
    deepLinkHandledRef.current = true;
    setSelectedHazardId(match.id);
    mapBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [hazardIdParam, hazards, hazardsLoading]);

  const handleSelectHazard = useCallback((hazard) => {
    setSelectedHazardId((prev) => (prev === hazard.id ? null : hazard.id));
    mapBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const handleHazardSelect = useCallback((hazard) => {
    if (!hazard) {
      setSelectedHazardId(null);
      return;
    }
    setSelectedHazardId((prev) => (prev === hazard.id ? null : hazard.id));
  }, []);

  usePageBreadcrumbDetail(route?.title);

  const geoJson = useMemo(
    () => buildRoutePreviewFeatureCollection(route?.preview ?? null),
    [route],
  );

  const sharePath =
    route?.id != null ? generatePath(ROUTES.routeDetails, { routeId: String(route.id) }) : null;

  return (
    <>
      <section className="hidden min-w-0 space-y-6 md:block">
        <RouteDetailsHeader route={route}>
          <ShareButton
            path={sharePath}
            title={route?.title || 'Route'}
            modalTitle="Share route"
            className="shrink-0"
          />
          <SavedRouteButton routeId={route?.id} isSavedHint={route?.isSaved} />
          {route?.id ? (
            <Button type="button" variant="neon" onClick={() => setScheduleOpen(true)}>
              Ride!
            </Button>
          ) : null}
        </RouteDetailsHeader>
        <div ref={mapBlockRef} className="relative z-0">
          <RouteMapWithElevation
            geoJson={geoJson}
            layout="split"
            hazards={hazards}
            selectedHazardId={selectedHazardId}
            onHazardSelect={handleHazardSelect}
            splitTrailing={
              <RouteWeatherPanel
                key={route?.id ?? 'route-weather'}
                route={route}
                isRouteLoading={routeLoading}
                layout="split"
              />
            }
          />
          <RouteDetailsDescription description={route?.description} />
        </div>
        {route?.id ? (
          <ScheduleRideFromRouteModal
            open={scheduleOpen}
            onClose={() => setScheduleOpen(false)}
            routeId={route.id}
            routeTitle={route.title || ''}
          />
        ) : null}
        <RouteMetadataPanel route={route} showUploadedBy={false} />
        <RouteHazardsPanel
          hazards={hazards}
          isLoading={hazardsLoading || routeLoading}
          selectedHazardId={selectedHazardId}
          onSelectHazard={handleSelectHazard}
        />
      </section>

      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <RouteDetailsPageBold
          route={route}
          geoJson={geoJson}
          isLoading={routeLoading}
          hazards={hazards}
          hazardsLoading={hazardsLoading}
          selectedHazardId={selectedHazardId}
          onSelectHazard={handleSelectHazard}
          onHazardSelect={handleHazardSelect}
        />
      </div>
    </>
  );
}
