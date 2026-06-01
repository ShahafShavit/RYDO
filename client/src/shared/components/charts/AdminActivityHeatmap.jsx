import { useMemo, useState } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * @param {{ timeZone: string, days: string[], hours: number[], values: number[][] }} heatmap
 */
export default function AdminActivityHeatmap({ heatmap, className = '' }) {
  const [hover, setHover] = useState(null);

  const { max, cellSize } = useMemo(() => {
    const values = heatmap?.values ?? [];
    let peak = 0;
    for (const row of values) {
      for (const v of row ?? []) {
        if (v > peak) peak = v;
      }
    }
    return { max: Math.max(1, peak), cellSize: 14 };
  }, [heatmap]);

  if (!heatmap?.values?.length) {
    return (
      <div className={cn('rounded-2xl border border-border bg-surface p-4', className)}>
        <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Activity heatmap (UTC)</p>
        <p className="mt-2 text-sm text-fg-muted">No hourly activity for this range.</p>
      </div>
    );
  }

  const hours = heatmap.hours ?? [];
  const days = heatmap.days ?? [];

  const cellColor = (count) => {
    const t = count / max;
    const opacity = 0.08 + t * 0.92;
    return `color-mix(in srgb, var(--rydo-purple) ${Math.round(opacity * 100)}%, transparent)`;
  };

  const gridWidth = hours.length * cellSize;
  const labelWidth = 36;

  return (
    <div className={cn('rounded-2xl border border-border bg-surface p-4', className)}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Activity heatmap (UTC)</p>
        {hover ? (
          <p className="rydo-tnum text-xs text-fg-muted">
            {hover.day} {String(hover.hour).padStart(2, '0')}:00 · {hover.count} users
          </p>
        ) : (
          <p className="text-xs text-fg-subtle">Peak {max} users · {heatmap.timeZone}</p>
        )}
      </div>

      <div className="-mx-1 overflow-x-auto pb-1">
        <div style={{ minWidth: labelWidth + gridWidth + 8 }}>
          <div className="flex" style={{ paddingLeft: labelWidth }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="rydo-tnum shrink-0 text-center text-[9px] text-fg-subtle"
                style={{ width: cellSize }}
              >
                {hour % 6 === 0 ? hour : ''}
              </div>
            ))}
          </div>

          {days.map((day, dayIndex) => (
            <div key={day} className="mt-0.5 flex items-center">
              <div className="rydo-tnum w-9 shrink-0 pr-1 text-right text-[10px] text-fg-subtle">{day}</div>
              <div className="flex">
                {hours.map((hour, hourIndex) => {
                  const count = heatmap.values[dayIndex]?.[hourIndex] ?? 0;
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className="shrink-0 rounded-[3px] border border-transparent"
                      style={{
                        width: cellSize - 2,
                        height: cellSize - 2,
                        margin: 1,
                        background: cellColor(count),
                      }}
                      onPointerEnter={() => setHover({ day, hour, count })}
                      onPointerLeave={() => setHover(null)}
                      title={`${day} ${hour}:00 UTC — ${count} users`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
