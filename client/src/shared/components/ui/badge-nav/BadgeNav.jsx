import { cn } from '@/shared/lib/cn';

/**
 * BadgeNav replaced PillSweep and manual tab buttons for in-page navigation.
 * It strictly uses the Badge component UI styles while providing button interactivity.
 */
export default function BadgeNav({ options = [], value, onChange, multi = false, activeValues = [], className }) {
    const handleClick = (option) => {
        if (multi) {
            const isActive = Array.isArray(activeValues) && activeValues.includes(option.value);
            const next = isActive ? activeValues.filter((v) => v !== option.value) : [...(activeValues || []), option.value];
            onChange?.(next);
            return;
        }
        onChange?.(option.value);
    };
    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            {options.map((option) => {
                // const isActive = value === option.value;
                const variant = option.variant || 'neon';
                const isActive = multi ? (Array.isArray(activeValues) && activeValues.includes(option.value)) : value === option.value;

                let activeStyles =
                    'border-rydo-purple/40 bg-rydo-purple/10 text-fg shadow-[0_0_18px_color-mix(in_srgb,var(--rydo-purple)_16%,transparent)]';

                if (variant === 'success') {
                    activeStyles =
                        'border-rydo-green/35 bg-rydo-green/10 text-fg shadow-[0_0_18px_color-mix(in_srgb,var(--rydo-green)_14%,transparent)]';
                }

                return (

                    <button
                        key={option.value}
                        type="button"
                        onClick={() => handleClick(option)}
                        className={cn(
                            'inline-flex items-center justify-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-xl transition-all duration-300',
                            isActive
                                ? activeStyles
                                : 'border-border bg-surface text-fg-muted hover:bg-surface-strong hover:text-fg hover:border-border-strong'
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}