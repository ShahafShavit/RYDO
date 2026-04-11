import { useState, useRef, useId, useCallback } from 'react';

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
 */
export default function ElevationProfileChart({ profile, className = '', onScrubChange }) {
  const svgRef = useRef(null);
  const fillGradientId = `elevFill-${useId().replace(/:/g, '')}`;
  const [hover, setHover] = useState(null);

  const w = 400;
  const h = 112;
  const padX = 12;
  const padY = 10;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

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
      if (p.x < padX || p.x > w - padX || p.y < padY || p.y > padY + chartH) {
        setHover(null);
        onScrubChange?.(null);
        return;
      }
      const distanceM = Math.max(0, Math.min(maxD, ((p.x - padX) / chartW) * maxD));
      const elevationM = elevationAtDistance(profile, distanceM);
      const deltaM = elevationM - startEl;
      const svgX = padX + (distanceM / maxD) * chartW;
      const svgY = padY + (1 - (elevationM - minEl) / elRange) * chartH;
      setHover({ svgX, svgY, distanceM, elevationM, deltaM });
      onScrubChange?.(distanceM);
    },
    [valid, profile, maxD, chartW, padX, padY, chartH, w, startEl, minEl, elRange, onScrubChange],
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
  const toY = (el) => padY + (1 - (el - minEl) / elRange) * chartH;

  const linePoints = profile.map((p) => `${toX(p.distanceM)},${toY(p.elevationM)}`).join(' ');
  const firstX = toX(profile[0].distanceM);
  const lastX = toX(profile[profile.length - 1].distanceM);
  const baseY = padY + chartH;
  const topLine = profile.map((p) => `${toX(p.distanceM)},${toY(p.elevationM)}`).join(' L ');
  const areaPath = `M ${firstX} ${baseY} L ${topLine} L ${lastX} ${baseY} Z`;

  const km = (maxD / 1000).toFixed(1);

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${className}`}
      onPointerLeave={clearHover}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-white/42">Elevation profile</p>
        <p className="text-xs text-white/48">
          {minEl.toFixed(0)}–{maxEl.toFixed(0)} m · {km} km
        </p>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="aspect-[400/112] w-full cursor-crosshair touch-none text-[#7B5CFF]"
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerEnter={handlePointer}
        role="img"
        aria-label="Elevation over distance; hover for values"
      >
        <title>Elevation over distance. Hover to see elevation and change from start.</title>
        <defs>
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(123, 92, 255)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(123, 92, 255)" stopOpacity="0.02" />
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
              y1={padY}
              y2={padY + chartH}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <circle cx={hover.svgX} cy={hover.svgY} r="5" fill="#0f0f14" stroke="#21F1A8" strokeWidth="2" />
          </g>
        ) : null}
        <text x={padX} y={h - 2} fill="rgba(255,255,255,0.35)" fontSize="10">
          0 km
        </text>
        <text x={w - padX} y={h - 2} fill="rgba(255,255,255,0.35)" fontSize="10" textAnchor="end">
          {km} km
        </text>
      </svg>
      {hover ? (
        <p className="mt-2 text-center text-sm text-white/88 tabular-nums">
          <span className="text-white/50">{(hover.distanceM / 1000).toFixed(2)} km</span>
          <span className="mx-2 text-white/30">·</span>
          <span title="Height above sea level at this point">{hover.elevationM.toFixed(0)} m</span>
          <span className="mx-2 text-white/30">·</span>
          <span className="text-[#21F1A8]" title="Change from starting elevation">
            Δ {hover.deltaM >= 0 ? '+' : ''}
            {hover.deltaM.toFixed(0)} m
          </span>
        </p>
      ) : (
        <p className="mt-2 text-center text-[11px] text-white/36">Hover along the profile · Δ vs start</p>
      )}
    </div>
  );
}
