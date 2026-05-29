import { useId } from 'react';
import { cn } from '@/shared/lib/cn';

export default function ProgressRing({
  value = 0.7,
  size = 72,
  strokeWidth = 6,
  color = 'var(--rydo-purple)',
  track = 'rgba(255,255,255,0.10)',
  children,
  className,
}) {
  const uid = useId().replace(/:/g, '');
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <defs>
          <linearGradient id={`r-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--rydo-green-bright)" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#r-${uid})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${(c * Math.min(value, 1)).toFixed(1)} ${c.toFixed(1)}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        {children}
      </div>
    </div>
  );
}
