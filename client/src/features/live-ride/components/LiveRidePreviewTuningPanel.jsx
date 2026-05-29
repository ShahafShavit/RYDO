import {
  DEFAULT_LIVE_RIDE_MOTION_TUNING,
  exportTuningAsTxt,
  groupTuningMetaByCategory,
  mergeLiveRideMotionTuning,
} from '@/features/live-ride/utils/liveRideMotionTuning';
import { SlidersHorizontal } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

/**
 * Dev-only style control surface for `/live` replay: tune smoothing constants and export as `.txt`.
 *
 * @param {{
 *   tuning: typeof DEFAULT_LIVE_RIDE_MOTION_TUNING,
 *   onTuningChange: (next: typeof DEFAULT_LIVE_RIDE_MOTION_TUNING) => void,
 * }} props
 */
export default function LiveRidePreviewTuningPanel({ tuning, onTuningChange }) {
  const [open, setOpen] = useState(false);
  const [paramQuery, setParamQuery] = useState('');

  const categories = useMemo(() => groupTuningMetaByCategory(), []);

  const filteredCategories = useMemo(() => {
    const q = paramQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map(({ category, groups }) => ({
        category,
        groups: groups
          .map(({ groupName, fields }) => ({
            groupName,
            fields: fields.filter(
              (f) =>
                f.key.toLowerCase().includes(q) ||
                f.label.toLowerCase().includes(q) ||
                f.description.toLowerCase().includes(q) ||
                f.domain.toLowerCase().includes(q),
            ),
          }))
          .filter((g) => g.fields.length > 0),
      }))
      .filter((c) => c.groups.length > 0);
  }, [categories, paramQuery]);

  const handleReset = useCallback(() => {
    onTuningChange(mergeLiveRideMotionTuning());
  }, [onTuningChange]);

  const handleExport = useCallback(() => {
    const blob = new Blob([exportTuningAsTxt(tuning)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rydo-live-ride-tuning-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tuning]);

  const setValue = useCallback(
    (key, raw) => {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n)) return;
      onTuningChange(mergeLiveRideMotionTuning({ ...tuning, [key]: n }));
    },
    [onTuningChange, tuning],
  );

  return (
    <div className="pointer-events-none fixed bottom-[max(6rem,8rem)] left-3 z-(--rydo-z-tool-panel) flex max-w-[min(100vw-1.5rem,22rem)] flex-col items-start gap-2 md:bottom-[max(7rem,9rem)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl border border-amber-500/35 bg-[color-mix(in_srgb,var(--rydo-bg-deep)_92%,transparent)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100/95 shadow-lg backdrop-blur-md hover:border-amber-400/50"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Preview tuning
      </button>

      {open ? (
        <div className="pointer-events-auto max-h-[min(70vh,32rem)] w-full overflow-y-auto rounded-2xl border border-border bg-[color-mix(in_srgb,var(--rydo-bg-deep)_96%,transparent)] p-3 text-fg shadow-2xl backdrop-blur-md">
          <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-white/10 pb-2">
            <p className="text-[11px] leading-snug text-fg-muted">
              Adjust motion smoothing for this session only. <span className="text-fg-subtle">Reset</span> restores
              coded defaults. <span className="text-fg-subtle">Export</span> downloads all keys for use in source.
            </p>
            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg"
              >
                Reset to defaults
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="flex-1 rounded-xl bg-amber-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
              >
                Export .txt
              </button>
            </div>
          </div>

          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
              Search parameters
            </span>
            <input
              type="search"
              value={paramQuery}
              onChange={(e) => setParamQuery(e.target.value)}
              placeholder="Filter by name, key, description…"
              className="w-full rounded-xl border border-border bg-black/35 px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
            />
          </label>

          {filteredCategories.length === 0 ? (
            <p className="py-4 text-center text-xs text-fg-muted">No parameters match.</p>
          ) : null}

          {filteredCategories.map(({ category, groups }, catIdx) => (
            <details
              key={category}
              className="border-b border-white/[0.06] py-2 last:border-0"
              open={paramQuery.trim() ? true : catIdx === 0}
            >
              <summary className="cursor-pointer list-none text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100/90 marker:content-none [&::-webkit-details-marker]:hidden">
                {category}
              </summary>
              <div className="mt-3 space-y-4 border-l border-white/[0.08] pl-3">
                {groups.map(({ groupName, fields }) => (
                  <div key={`${category}:${groupName}`} className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{groupName}</p>
                    {fields.map((field) => {
                      const v = tuning[field.key];
                      const cur =
                        typeof v === 'number' && Number.isFinite(v) ? v : DEFAULT_LIVE_RIDE_MOTION_TUNING[field.key];
                      return (
                        <div key={field.key} className="space-y-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-1">
                            <span className="text-xs font-medium text-fg">{field.label}</span>
                            <span className="font-mono text-[11px] tabular-nums text-emerald-400/95">
                              {cur}
                              {field.unit ? ` ${field.unit}` : ''}
                            </span>
                          </div>
                          <p className="text-[11px] leading-snug text-fg-muted">{field.description}</p>
                          <p className="text-[10px] text-fg-subtle">
                            <span className="font-medium text-fg-muted">Domain:</span> {field.domain}
                          </p>
                          <input
                            type="number"
                            step={field.step ?? 'any'}
                            value={Number.isFinite(cur) ? String(cur) : ''}
                            onChange={(e) => setValue(field.key, e.target.value)}
                            className="w-full rounded-lg border border-border bg-black/30 px-2 py-1.5 text-sm text-fg"
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : null}
    </div>
  );
}
