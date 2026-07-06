import { useMemo, useRef, useState } from 'react';

import { useNavigate, generatePath, Link } from 'react-router-dom';

import { ArrowLeft, Bike, Clock, Mountain, Route as RouteIcon, Share2, AlertTriangle, Heart } from 'lucide-react';

import { ROUTES } from '@/app/router/route-paths';
import { userProfilePath } from '@/shared/lib/user-paths';

import SavedRouteButton from '@/features/routes/components/SavedRouteButton';

import ScheduleRideFromRouteModal from '@/features/rides/components/ScheduleRideFromRouteModal';

import BoldRouteMapElevation from '@/features/routes/components/BoldRouteMapElevation';

import { buildElevationProfileFromGeoJson } from '@/features/routes/utils/gpxAnalysis';

import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';

import { formatTrailMetaLabel } from '@/features/routes/utils/route-formatters';
import { estimatedTimeTooltip } from '@/features/routes/utils/durationSourceTooltip';
import { helpTooltip } from '@/shared/content/help-tooltips';
import LabelWithHelp from '@/shared/components/ui/info-tooltip/LabelWithHelp';

import RouteWeatherPanel from '@/features/weather/RouteWeatherPanel';
import RouteHazardsPanel from '@/features/hazards/components/RouteHazardsPanel';

import Eyebrow from '@/shared/components/bold/Eyebrow';

import DisplayTitle from '@/shared/components/bold/DisplayTitle';

import StatRibbon from '@/shared/components/bold/StatRibbon';

import GradientCTA from '@/shared/components/bold/GradientCTA';

import IconButton from '@/shared/components/bold/IconButton';

import ProgressRing from '@/shared/components/bold/viz/ProgressRing';

import BoldScreen from '@/shared/components/bold/BoldScreen';
import BoldScrollArea from '@/shared/components/bold/BoldScrollArea';
import MobileFloatingActions from '@/shared/components/layout/mobile-chrome/MobileFloatingActions';
import { desktopChromeFooterClass } from '@/shared/components/layout/mobile-chrome/mobileChromeFooter';

import UserAvatar from '@/shared/components/user/UserAvatar';

import { cn } from '@/shared/lib/cn';

import { useShare } from '@/shared/hooks/useShare';
import ShareSheetModal from '@/shared/components/share/ShareSheetModal';

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
  return '?';
}

export default function RouteDetailsPageBold({
  route,
  geoJson,
  isLoading,
  hazards = [],
  hazardsLoading = false,
  selectedHazardId = null,
  onSelectHazard,
  onHazardSelect,
}) {
  const navigate = useNavigate();
  const mapPanelRef = useRef(null);
  const { formatKm, formatElevation, labels, unit } = useFormatDistance();
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const sharePath =
    route?.id != null ? generatePath(ROUTES.routeDetails, { routeId: String(route.id) }) : null;
  const { share, modalProps } = useShare({
    path: sharePath,
    title: route?.title || 'Route',
  });

  const profile = useMemo(() => buildElevationProfileFromGeoJson(geoJson), [geoJson]);



  const difficulty = formatTrailMetaLabel(route?.difficulty || '');

  const terrain = formatTrailMetaLabel(route?.terrain || 'mixed');

  const warnings = route?.warnings ?? [];

  const riders = route?.routeRiders?.visibleRiders ?? route?.routeRiders?.riders ?? [];

  const ridersCount = route?.routeRiders?.totalCount ?? 0;

  const favoriteCount = Math.max(0, Number(route?.favoriteCount ?? 0) || 0);
  const favoriteTitle =
    favoriteCount === 1
      ? '1 person saved this route as a favorite'
      : `${favoriteCount} people saved this route as favorites`;

  const cb = route?.createdBy;
  const showUploader = cb?.handle && cb?.fullName;

  const physics = route?.physicsDifficultyScore;

  const distanceLabel =

    route?.distanceKm != null ? formatKm(route.distanceKm) : '—';



  if (isLoading && !route) {

    return (

      <BoldScreen className="min-h-[60dvh] animate-pulse">

        <div className="h-8 w-3/4 rounded bg-surface-strong mx-5 mt-6" />

      </BoldScreen>

    );

  }



  if (!route) {

    return (

      <BoldScreen className="p-5">

        <p className="text-fg-muted">Route not found.</p>

      </BoldScreen>

    );

  }



  const physicsBadge =
    physics != null && Number.isFinite(Number(physics)) ? (
      <div className="flex items-center gap-1.5">
        <ProgressRing value={Number(physics) / 10} size={26} strokeWidth={3.5}>
          <span className="rydo-stat-hero text-[9px]">{Number(physics).toFixed(1)}</span>
        </ProgressRing>
        <LabelWithHelp
          className="rydo-subtle text-[11px]"
          labelClassName="inline"
          hint={helpTooltip('physicsIntensity')}
          topic="Physics intensity"
        >
          Physics intensity <b className="text-fg">/10</b>
        </LabelWithHelp>
      </div>
    ) : null;



  return (

    <BoldScreen>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

        <div className="flex items-center gap-3 px-5 pb-1 pt-1">

          <IconButton icon={ArrowLeft} size="lg" aria-label="Back" onClick={() => navigate(-1)} />

          <div className="flex-1" />

          <IconButton icon={Share2} size="lg" aria-label="Share" onClick={share} />

        </div>



        <BoldScrollArea className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pt-1 [&>*]:shrink-0">

          <div className="min-w-0">

            <DisplayTitle size="lg" truncate="mobile" title={route.title || 'Untitled'}>
              {route.title || 'Untitled'}
            </DisplayTitle>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {showUploader ? (
                <Link
                  to={userProfilePath(cb.handle)}
                  className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-sm text-fg/90 no-underline transition hover:border-border-strong hover:bg-surface-strong"
                >
                  {cb.avatarUrl ? (
                    <img
                      src={cb.avatarUrl}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-strong text-[10px] font-semibold text-fg/80"
                      aria-hidden
                    >
                      {initialsFromName(cb.fullName)}
                    </span>
                  )}
                  <span className="min-w-0 truncate">
                    <span className="text-fg-subtle">Uploaded by </span>
                    <span className="font-medium text-fg/92">{cb.fullName}</span>
                  </span>
                </Link>
              ) : null}
              <div
                role="img"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[13px] text-fg/90"
                title={favoriteTitle}
                aria-label={favoriteTitle}
              >
                <Heart className="h-3.5 w-3.5 shrink-0 text-rydo-purple opacity-90" strokeWidth={2} aria-hidden />
                <span className="font-semibold tabular-nums">{favoriteCount}</span>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-2">

              {riders.slice(0, 4).map((r, i) => (

                <UserAvatar

                  key={r.userId ?? i}

                  avatarUrl={r.avatarUrl}

                  displayName={r.fullName}

                  sizeClass="h-6 w-6"

                  textClass="text-[9px]"

                  className={cn(i > 0 && '-ml-2 ring-2 ring-[#141414]')}

                />

              ))}

              {ridersCount > 0 ? (

                <span className="rydo-subtle text-[13px]">

                  <b className="text-[var(--rydo-green-bright)]">{ridersCount}</b> riders rode this

                </span>

              ) : null}

            </div>

          </div>



          <div className="rydo-panel grid gap-3 px-4 py-3.5 sm:grid-cols-2">
            {difficulty ? (
              <div>
                <LabelWithHelp
                  as="p"
                  className="text-[11px] font-medium uppercase tracking-[0.12em] text-fg-subtle"
                  hint={helpTooltip('routeDifficulty')}
                  topic="Difficulty"
                >
                  Difficulty
                </LabelWithHelp>
                <p className="mt-1 text-sm font-semibold uppercase tracking-wide">{difficulty}</p>
              </div>
            ) : null}
            <div>
              <LabelWithHelp
                as="p"
                className="text-[11px] font-medium uppercase tracking-[0.12em] text-fg-subtle"
                hint={helpTooltip('routeTerrain')}
                topic="Terrain"
              >
                Terrain
              </LabelWithHelp>
              <p className="mt-1 text-sm font-semibold">{terrain}</p>
            </div>
            {warnings.length > 0 ? (
              <div className="sm:col-span-2">
                <LabelWithHelp
                  as="p"
                  className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-fg-subtle"
                  hint={helpTooltip('routeWarnings')}
                  topic="Route warnings"
                >
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  Hazards
                </LabelWithHelp>
                <p className="mt-1 text-sm font-semibold">
                  {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
                </p>
              </div>
            ) : null}
          </div>



          <div className="rydo-panel px-1 py-2">

            <StatRibbon

              paddingClass="px-3 py-2"

              items={[

                { key: 'km', icon: RouteIcon, value: distanceLabel, label: labels.distance },

                {
                  key: 'up',
                  icon: Mountain,
                  value:
                    route.elevationGainM != null
                      ? formatElevation(route.elevationGainM, 0)
                      : '—',
                  label: labels.elevation,
                  tooltip: helpTooltip('elevationGain'),
                },
                {
                  key: 'time',
                  icon: Clock,
                  value: formatDuration(route.estimatedDurationMinutes),
                  label: 'Est. time',
                  tooltip: estimatedTimeTooltip(route.estimatedDurationSource, unit),
                },

              ]}

            />

          </div>



          <div ref={mapPanelRef} className="rydo-panel shrink-0 overflow-hidden px-3 py-3">

            <BoldRouteMapElevation
              geoJson={geoJson}
              profile={profile}
              headerExtra={physicsBadge}
              hazards={hazards}
              selectedHazardId={selectedHazardId}
              onHazardSelect={onHazardSelect}
            />

          </div>



          {route.description ? (

            <p className="rydo-subtle line-clamp-4 text-[13px] leading-relaxed">{route.description}</p>

          ) : null}



          <RouteHazardsPanel
            hazards={hazards}
            isLoading={hazardsLoading || isLoading}
            layout="split"
            selectedHazardId={selectedHazardId}
            onSelectHazard={(hazard) => {
              mapPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              onSelectHazard?.(hazard);
            }}
          />

          <RouteWeatherPanel route={route} isRouteLoading={isLoading} layout="split" />
        </BoldScrollArea>

        <div className={cn(desktopChromeFooterClass, 'hidden md:flex')}>
          <div className="shrink-0">
            <SavedRouteButton routeId={route.id} variant="icon" />
          </div>
          <GradientCTA
            className="min-w-0 flex-1 whitespace-nowrap"
            icon={Bike}
            heightClass="h-12"
            onClick={() => setScheduleOpen(true)}
          >
            Start this ride
          </GradientCTA>
        </div>

        <MobileFloatingActions className="md:hidden">
          <div className="shrink-0">
            <SavedRouteButton routeId={route.id} variant="icon" className="h-12 w-12" />
          </div>
          <GradientCTA
            className="min-w-0 flex-1 whitespace-nowrap"
            icon={Bike}
            heightClass="h-12"
            onClick={() => setScheduleOpen(true)}
          >
            Start this ride
          </GradientCTA>
        </MobileFloatingActions>
      </div>



      {route.id ? (

        <ScheduleRideFromRouteModal

          open={scheduleOpen}

          onClose={() => setScheduleOpen(false)}

          routeId={route.id}

          routeTitle={route.title || ''}

        />

      ) : null}

      <ShareSheetModal {...modalProps} title="Share route" />
    </BoldScreen>

  );

}


