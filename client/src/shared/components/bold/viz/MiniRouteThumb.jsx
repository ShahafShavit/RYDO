import { useId } from 'react';

const PATHS = [
  'M8 44 C24 30 26 16 40 20 C54 24 52 8 68 12',
  'M10 14 C26 22 24 38 40 34 C56 30 56 46 70 44',
  'M8 30 C22 18 30 40 44 28 C58 16 56 40 70 26',
];

export default function MiniRouteThumb({ seed = 0, accent = '#8b6bff', className }) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 78 56"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`m-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--rydo-green-bright)" />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
      </defs>
      <rect width="78" height="56" fill="rgba(123,92,255,0.07)" />
      <g stroke="rgba(255,255,255,0.06)" strokeWidth="0.8">
        {[14, 28, 42].map((y) => (
          <line key={y} x1="0" y1={y} x2="78" y2={y} />
        ))}
        {[26, 52].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="56" />
        ))}
      </g>
      <path
        d={PATHS[seed % 3]}
        fill="none"
        stroke={`url(#m-${uid})`}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
