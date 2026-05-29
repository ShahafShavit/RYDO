import { useState, useRef, useId, useCallback } from 'react';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import { cn } from '@/shared/lib/cn';

/**
 * Linear interpolation of elevation at a given distance along the profile.
 */
function elevationAtDistance(profile, distanceM) {
  if (!profile.length) return 0;
  if (distanceM <= profile[0].distanceM) return profile[0].elevationM;
  const last = profile[profile.length - 1];
  if (distanceM >= last.distanceM) return last.elevationM;
  let i = 0;
  while (i < profile.length - 1 && profile[i + 1].distanceM < distanceM) i += 1;
  const a = profile[i];
  const b = profile[i + 1];
  const span = b.distanceM - a.distanceM;
  const t = span > 0 ? (distanceM - a.distanceM) / span : 0;
  return a.elevationM + t * (b.elevationM - a.elevationM);
}

/**
 * Compact elevation vs distance profile (SVG). Distance on horizontal axis.
 * Hover to see distance, absolute elevation, and Δ from start.
 * @param {'default' | 'embed'} [variant='default'] — `embed` drops outer card chrome for Bold panels.
 * @param {boolean} [showHeader=true] — Title + range row; set false when the parent supplies a section label.
 * @param {boolean} [showRangeLabel=true] — Distance/elevation range under embed headers.
 * @param {boolean} [interactive=true] — Hover scrub; disable on small card thumbnails.
 * @param {boolean} [fillHeight] — Stretch to parent height (e.g. side-by-side with map).
 */
export default function ElevationProfileChart({
  profile,
  className = '',
  onScrubChange,
  fillHeight = false,
  variant = 'default',
  showHeader = true,
  showRangeLabel = true,
  interactive = true,
}) {
  const { formatMeters, formatElevation, formatElevationRange } = useFormatDistance();
  const svgRef = useRef(null);
  const fillGradientId = `elevFill-${useId().replace(/:/g, '')}`;
  const [hover, setHover] = useState(null);

  const w = 400;
  const h = 104;
  const padX = 12;
  const padTop = 8;
  const padBottom = 22;
  const chartW = w - padX * 2;
  const chartH = h - padTop - padBottom;

  const valid = Array.isArray(profile) && profile.length >= 2;

  const maxD = valid ? Math.max(profile[profile.length - 1].distanceM, 1) : 1;
  const els = valid ? profile.map((p) => p.elevationM) : [0, 0];
  const minEl = valid ? Math.min(...els) : 0;
  const maxEl = valid ? Math.max(...els) : 0;
  const elRange = Math.max(maxEl - minEl, 1);
  const startEl = valid ? profile[0].elevationM : 0;

  const updateHover = useCallback(
    (clientX, clientY) => {
      if (!valid || !profile) return;
      const svg = svgRef.current;
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const p = pt.matrixTransform(ctm.inverse());
      if (p.x < padX || p.x > w - padX || p.y < padTop || p.y > padTop + chartH) {
        setHover(null);
        onScrubChange?.(null);
        return;
      }
      const distanceM = Math.max(0, Math.min(maxD, ((p.x - padX) / chartW) * maxD));
      const elevationM = elevationAtDistance(profile, distanceM);
      const deltaM = elevationM - startEl;
      const svgX = padX + (distanceM / maxD) * chartW;
      const svgY = padTop + (1 - (elevationM - minEl) / elRange) * chartH;
      setHover({ svgX, svgY, distanceM, elevationM, deltaM });
      onScrubChange?.(distanceM);
    },
    [valid, profile, maxD, chartW, padX, padTop, chartH, w, startEl, minEl, elRange, onScrubChange],
  );

  const handlePointer = (e) => {
    updateHover(e.clientX, e.clientY);
  };

  const clearHover = () => {
    setHover(null);
    onScrubChange?.(null);
  };

  if (!valid) return null;

  const toX = (d) => padX + (d / maxD) * chartW;
  const toY = (el) => padTop + (1 - (el - minEl) / elRange) * chartH;

  const linePoints = profile.map((p) => `${toX(p.distanceM)},${toY(p.elevationM)}`).join(' ');
  const firstX = toX(profile[0].distanceM);
  const lastX = toX(profile[profile.length - 1].distanceM);
  const baseY = padTop + chartH;
  const topLine = profile.map((p) => `${toX(p.distanceM)},${toY(p.elevationM)}`).join(' L ');
  const areaPath = `M ${firstX} ${baseY} L ${topLine} L ${lastX} ${baseY} Z`;

  const maxDistLabel = formatMeters(maxD, 1);
  const rangeLabel = `${formatElevationRange(minEl, maxEl)} · ${maxDistLabel}`;
  const embed = variant === 'embed';

  return (
    <div
      className={cn(
        embed ? 'min-w-0' : 'rounded-2xl border border-border bg-surface p-4',
        fillHeight && 'flex h-full min-h-0 flex-col',
        className,
      )}
      onPointerLeave={interactive ? clearHover : undefined}
    >
      {showHeader ? (
        <div className="mb-2 flex shrink-0 items-baseline justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Elevation profile</p>
          {showRangeLabel ? (
            <p className="text-xs tabular-nums text-fg-subtle">{rangeLabel}</p>
          ) : null}
        </div>
      ) : showRangeLabel ? (
        <p className="mb-1.5 shrink-0 text-right text-[10px] tabular-nums text-fg-subtle">{rangeLabel}</p>
      ) : null}

      <div className="min-w-0 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${h}`}
          className={cn(
            'w-full text-rydo-purple',
            interactive ? 'cursor-crosshair touch-none' : 'pointer-events-none',
            fillHeight
              ? 'min-h-0 min-w-0 flex-1'
              : embed
                ? interactive
                  ? 'aspect-[400/104] max-h-[7.5rem]'
                  : 'aspect-[400/72] max-h-[2.75rem]'
                : 'aspect-[400/104]',
          )}
          preserveAspectRatio="xMidYMid meet"
          onPointerMove={interactive ? handlePointer : undefined}
          onPointerDown={interactive ? handlePointer : undefined}
          onPointerEnter={interactive ? handlePointer : undefined}
          role="img"
          aria-label="Elevation over distance; hover for values"
        >
          <title>Elevation over distance. Hover to see elevation and change from start.</title>
          <defs>
            <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${fillGradientId})`} stroke="none" />
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={linePoints}
          />
          {hover ? (
            <g pointerEvents="none">
              <line
                x1={hover.svgX}
                x2={hover.svgX}
                y1={padTop}
                y2={padTop + chartH}
                stroke="var(--rydo-text-subtle)"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
              <circle
                cx={hover.svgX}
                cy={hover.svgY}
                r="5"
                fill="var(--rydo-bg-deep)"
                stroke="var(--rydo-green)"
                strokeWidth="2"
              />
            </g>
          ) : null}
          <text x={padX} y={h - 6} fill="var(--rydo-text-subtle)" fontSize="10">
            {formatMeters(0, 1)}
          </text>
          <text x={w - padX} y={h - 6} fill="var(--rydo-text-subtle)" fontSize="10" textAnchor="end">
            {maxDistLabel}
          </text>
        </svg>
      </div>

      <div
        className={cn(
          'mt-2 flex shrink-0 items-center justify-center text-center tabular-nums leading-snug',
          embed ? 'min-h-[2rem] text-xs' : 'min-h-[2.75rem] text-sm',
        )}
      >
        {hover ? (
          <p className="text-fg/90">
            <span className="text-fg-muted">{formatMeters(hover.distanceM, 2)}</span>
            <span className="mx-2 text-fg-subtle">·</span>
            <span title="Height above sea level at this point">{formatElevation(hover.elevationM, 0)}</span>
            <span className="mx-2 text-fg-subtle">·</span>
            <span className="text-rydo-green" title="Change from starting elevation">
              Δ {hover.deltaM >= 0 ? '+' : '-'}
              {formatElevation(Math.abs(hover.deltaM), 0)}
            </span>
          </p>
        ) : (
          <p className="text-fg-subtle">Hover along the profile · Δ vs start</p>
        )}
      </div>
    </div>
  );
}
