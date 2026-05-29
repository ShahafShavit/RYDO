import { useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { ArrowLeft, Bike, Clock, Mountain, Route as RouteIcon, Share2, AlertTriangle } from 'lucide-react';

import SavedRouteButton from '@/features/routes/components/SavedRouteButton';

import ScheduleRideFromRouteModal from '@/features/rides/components/ScheduleRideFromRouteModal';

import BoldRouteMapElevation from '@/features/routes/components/BoldRouteMapElevation';

import { buildElevationProfileFromGeoJson } from '@/features/routes/utils/gpxAnalysis';

import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';

import { formatTrailMetaLabel } from '@/features/routes/utils/route-formatters';

import RouteWeatherPanel from '@/features/weather/RouteWeatherPanel';

import Eyebrow from '@/shared/components/bold/Eyebrow';

import DisplayTitle from '@/shared/components/bold/DisplayTitle';

import StatRibbon from '@/shared/components/bold/StatRibbon';

import GradientCTA from '@/shared/components/bold/GradientCTA';

import IconButton from '@/shared/components/bold/IconButton';

import ProgressRing from '@/shared/components/bold/viz/ProgressRing';

import BoldScreen from '@/shared/components/bold/BoldScreen';

import UserAvatar from '@/shared/components/user/UserAvatar';

import { cn } from '@/shared/lib/cn';



function formatDuration(minutes) {

  if (!minutes && minutes !== 0) return '—';

  const h = Math.floor(minutes / 60);

  const m = minutes % 60;

  return h > 0 ? `${h}h ${m}m` : `${m}m`;

}



export default function RouteDetailsPageBold({ route, geoJson, isLoading }) {

  const navigate = useNavigate();

  const { formatKm, formatElevation, labels } = useFormatDistance();

  const [scheduleOpen, setScheduleOpen] = useState(false);



  const profile = useMemo(() => buildElevationProfileFromGeoJson(geoJson), [geoJson]);



  const difficulty = formatTrailMetaLabel(route?.difficulty || '');

  const terrain = formatTrailMetaLabel(route?.terrain || 'mixed');

  const warnings = route?.warnings ?? [];

  const riders = route?.routeRiders?.riders ?? [];

  const ridersCount = route?.routeRiders?.totalCount ?? 0;

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

      <div className="flex items-center gap-2">

        <ProgressRing value={Number(physics) / 10} size={26} strokeWidth={3.5}>

          <span className="rydo-stat-hero text-[9px]">{Number(physics).toFixed(1)}</span>

        </ProgressRing>

        <span className="rydo-subtle text-[11px]">

          Physics <b className="text-fg">/10</b>

        </span>

      </div>

    ) : null;



  return (

    <BoldScreen className="min-h-[100dvh] md:min-h-0">

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

        <div className="flex items-center gap-3 px-5 pb-1 pt-1">

          <IconButton icon={ArrowLeft} size="lg" aria-label="Back" onClick={() => navigate(-1)} />

          <div className="flex-1" />

          <IconButton icon={Share2} size="lg" aria-label="Share" onClick={() => {}} />

        </div>



        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-4 pt-1">

          <div>

            <div className="mb-2.5 flex flex-wrap gap-2">

              {difficulty ? (

                <span className="rydo-pill rydo-pill-amber text-[11px] font-bold uppercase tracking-wider">

                  {difficulty}

                </span>

              ) : null}

              <span className="rydo-pill text-[13px]">{terrain}</span>

              {warnings.length > 0 ? (

                <span className="rydo-pill rydo-pill-amber inline-flex gap-1 text-[11px]">

                  <AlertTriangle className="h-3 w-3" aria-hidden />

                  {warnings.length} hazards

                </span>

              ) : null}

            </div>

            <DisplayTitle size="lg">{route.title || 'Untitled'}</DisplayTitle>

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

                },

                {

                  key: 'time',

                  icon: Clock,

                  value: formatDuration(route.estimatedDurationMinutes),

                  label: 'Est. time',

                },

              ]}

            />

          </div>



          <div className="rydo-panel overflow-hidden px-3 py-3">

            <BoldRouteMapElevation

              geoJson={geoJson}

              profile={profile}

              headerExtra={physicsBadge}

            />

          </div>



          {route.description ? (

            <p className="rydo-subtle line-clamp-4 text-[13px] leading-relaxed">{route.description}</p>

          ) : null}



          <RouteWeatherPanel route={route} isRouteLoading={isLoading} layout="split" />

        </div>



        <div className="flex shrink-0 items-center gap-3 border-t border-border/60 px-5 py-3.5">

          <div className="shrink-0">

            <SavedRouteButton routeId={route.id} variant="icon" />

          </div>

          <GradientCTA

            className="flex-1 whitespace-nowrap"

            icon={Bike}

            onClick={() => setScheduleOpen(true)}

          >

            Start this ride

          </GradientCTA>

        </div>

      </div>



      {route.id ? (

        <ScheduleRideFromRouteModal

          open={scheduleOpen}

          onClose={() => setScheduleOpen(false)}

          routeId={route.id}

          routeTitle={route.title || ''}

        />

      ) : null}

    </BoldScreen>

  );

}


