import { useId, useMemo, useState } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * @param {{ date: string, count: number }[]} series
 * @param {string} [valueLabel='count']
 */
export default function AdminTrendChart({
  series = [],
  title,
  className = '',
  valueLabel = 'Users',
  accentClass = 'text-rydo-purple',
}) {
  const fillGradientId = useId();
  const [hover, setHover] = useState(null);

  const { points, maxY, w, h, padTop, chartH } = useMemo(() => {
    const width = 400;
    const height = 120;
    const px = 8;
    const pt = 12;
    const pb = 4;
    const cw = width - px * 2;
    const ch = height - pt - pb;
    const max = Math.max(1, ...series.map((d) => d.count ?? 0));
    const pts = series.map((d, i) => {
      const x = px + (series.length <= 1 ? cw / 2 : (i / (series.length - 1)) * cw);
      const y = pt + (1 - (d.count ?? 0) / max) * ch;
      return { x, y, ...d, index: i };
    });
    return {
      points: pts,
      maxY: max,
      w: width,
      h: height,
      padX: px,
      padTop: pt,
      chartW: cw,
      chartH: ch,
    };
  }, [series]);

  if (!series.length) {
    return (
      <div className={cn('rounded-2xl border border-border bg-surface p-4', className)}>
        {title ? <p className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">{title}</p> : null}
        <p className="text-sm text-fg-muted">No data for this range.</p>
      </div>
    );
  }

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const baseY = padTop + chartH;
  const areaPath =
    points.length === 1
      ? `M ${points[0].x - 4} ${baseY} L ${points[0].x - 4} ${points[0].y} L ${points[0].x + 4} ${points[0].y} L ${points[0].x + 4} ${baseY} Z`
      : `M ${points[0].x} ${baseY} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x} ${baseY} Z`;

  const handlePointer = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * w;
    let nearest = points[0];
    let minDist = Infinity;
    for (const p of points) {
      const dist = Math.abs(p.x - relX);
      if (dist < minDist) {
        minDist = dist;
        nearest = p;
      }
    }
    setHover(nearest);
  };

  return (
    <div className={cn('rounded-2xl border border-border bg-surface p-4', className)}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        {title ? <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{title}</p> : null}
        {hover ? (
          <p className="rydo-tnum text-xs text-fg-muted">
            {hover.date} · {hover.count} {valueLabel.toLowerCase()}
          </p>
        ) : (
          <p className="rydo-tnum text-xs text-fg-subtle">Peak {maxY}</p>
        )}
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={cn('aspect-[400/120] w-full touch-none', accentClass)}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={title || 'Trend chart'}
      >
        <defs>
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${fillGradientId})`} stroke="none" />
        {points.length > 1 ? (
          <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" points={linePoints} />
        ) : (
          <circle cx={points[0].x} cy={points[0].y} r="4" fill="currentColor" />
        )}
        {hover ? (
          <>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={padTop}
              y2={padTop + chartH}
              stroke="currentColor"
              strokeOpacity="0.25"
            />
            <circle cx={hover.x} cy={hover.y} r="4" fill="currentColor" />
          </>
        ) : null}
      </svg>
    </div>
  );
}
