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
                    'border-[#7B5CFF]/40 bg-[#7B5CFF]/10 text-white shadow-[0_0_18px_rgba(123,92,255,0.16)]';

                if (variant === 'success') {
                    activeStyles =
                        'border-[#21F1A8]/35 bg-[#21F1A8]/10 text-white shadow-[0_0_18px_rgba(33,241,168,0.14)]';
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
                                : 'border-white/12 bg-white/6 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20'
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}