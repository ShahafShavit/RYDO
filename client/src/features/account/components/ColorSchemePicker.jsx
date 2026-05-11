import { cn } from '@/shared/lib/cn';

const SCHEMES = [
  { id: 'midnight', label: 'Midnight', hint: 'Dark · copper & teal' },
  { id: 'evergreen', label: 'Evergreen', hint: 'Dark · chartreuse & spring' },
  { id: 'abyss', label: 'Abyss', hint: 'Dark · cyan & periwinkle' },
  { id: 'daylight', label: 'Daylight', hint: 'Light · cool sky & cobalt' },
  { id: 'sage', label: 'Sage', hint: 'Light · celadon & plum' },
  { id: 'dune', label: 'Dune', hint: 'Light · sand & rust' },
];

export function ColorSchemePicker({ value, onChange, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="group" aria-label="Color scheme">
      {SCHEMES.map((s) => {
        const selected = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s.id)}
            className={cn(
              'rounded-2xl border px-3 py-3 text-left transition',
              selected
                ? 'border-rydo-purple bg-rydo-purple/15 ring-2 ring-rydo-purple/35'
                : 'border-border bg-surface hover:border-border-strong',
            )}
          >
            <span className="block text-sm font-medium text-fg">{s.label}</span>
            <span className="mt-0.5 block text-xs text-fg-subtle">{s.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
