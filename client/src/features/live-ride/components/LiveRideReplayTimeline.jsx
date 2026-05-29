import { useMemo } from 'react';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';

/**
 * Scrub bar for GPX/KML replay: segment colors reflect speed (blue → red).
 */
export default function LiveRideReplayTimeline({
  fixes,
  durationMs,
  elapsedMs,
  onSeek,
  onScrubStart,
  disabled = false,
}) {
  const { formatSpeed } = useFormatDistance();
  const speeds = useMemo(() => {
    if (!fixes?.length) return { min: 0, max: 1 };
    let min = Infinity;
    let max = -Infinity;
    for (let i = 1; i < fixes.length; i++) {
      const s = fixes[i].speedMps;
      if (Number.isFinite(s)) {
        min = Math.min(min, s);
        max = Math.max(max, s);
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
      return { min: 0, max: Math.max(0.01, max, 1) };
    }
    return { min, max };
  }, [fixes]);

  const segments = useMemo(() => {
    if (!fixes || fixes.length < 2 || durationMs <= 0) return [];
    const { min, max } = speeds;
    const out = [];
    for (let i = 1; i < fixes.length; i++) {
      const dt = fixes[i].offsetMs - fixes[i - 1].offsetMs;
      if (dt <= 0) continue;
      const s = fixes[i].speedMps;
      const t = max > min ? (s - min) / (max - min) : 0.5;
      const u = Math.max(0, Math.min(1, t));
      const r = Math.round(59 + (239 - 59) * u);
      const g = Math.round(130 + (68 - 130) * u);
      const b = Math.round(246 + (68 - 246) * u);
      out.push({
        key: i,
        flex: dt,
        color: `rgb(${r},${g},${b})`,
      });
    }
    return out;
  }, [fixes, durationMs, speeds]);

  const progress = durationMs > 0 ? Math.max(0, Math.min(1, elapsedMs / durationMs)) : 0;

  if (!fixes?.length || durationMs <= 0) {
    return null;
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-[0.12em] text-fg-subtle">
        <span>Timeline</span>
        <span className="tabular-nums text-fg-muted normal-case">
          {(elapsedMs / 1000).toFixed(0)}s / {(durationMs / 1000).toFixed(0)}s
        </span>
      </div>
      <div
        className="relative overflow-hidden rounded-lg border border-white/10 bg-black/30"
        title="Low speed: blue · High speed: red"
      >
        <div className="flex h-3 w-full">
          {segments.map((s) => (
            <div
              key={s.key}
              className="h-full min-w-px"
              style={{ flex: `${s.flex} 0 0px`, backgroundColor: s.color }}
            />
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]"
          style={{ left: `${progress * 100}%`, transform: 'translateX(-50%)' }}
          aria-hidden
        />
      </div>
      <label className="block">
        <span className="sr-only">Scrub replay position</span>
        <input
          type="range"
          min={0}
          max={durationMs}
          step={Math.max(1, Math.floor(durationMs / 2000))}
          value={Math.min(elapsedMs, durationMs)}
          disabled={disabled}
          onPointerDown={(e) => {
            e.stopPropagation();
            onScrubStart?.();
          }}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onSeek(v);
          }}
          className="h-2 w-full cursor-pointer accent-rydo-purple disabled:cursor-not-allowed disabled:opacity-50"
        />
      </label>
      <div className="flex justify-between text-[10px] tabular-nums text-fg-subtle">
        <span>{formatSpeed(speeds.min, 0)}</span>
        <span className="text-fg-muted">{formatSpeed(speeds.max, 0)}</span>
      </div>
    </div>
  );
}
