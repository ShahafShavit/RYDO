import Eyebrow from '@/shared/components/bold/Eyebrow';
import { cn } from '@/shared/lib/cn';

export default function Stat({
  icon: Icon,
  value,
  unit,
  label,
  size = 21,
  accent = 'text-[var(--rydo-green-bright)]',
  align = 'left',
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        align === 'center' ? 'items-center' : 'items-start',
        className,
      )}
    >
      {Icon ? (
        <span className={accent}>
          <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
      ) : null}
      <span
        className="rydo-stat-hero whitespace-nowrap text-fg"
        style={{ fontSize: size }}
      >
        {value}
        {unit ? (
          <span
            className="rydo-subtle ml-0.5 font-bold tracking-normal"
            style={{ fontSize: size * 0.52 }}
          >
            {unit}
          </span>
        ) : null}
      </span>
      <Eyebrow className="text-[10px]">{label}</Eyebrow>
    </div>
  );
}
