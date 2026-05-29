import { useId, useLayoutEffect, useRef, useState } from 'react';

const RL_PATH =
  'M 30 188 C 56 168 60 132 92 134 C 122 136 128 176 158 168 ' +
  'C 190 159 188 104 220 96 C 250 88 262 122 292 112 C 318 103 312 64 338 58';

const RL_CONTOURS = [
  'M 70 70 C 120 40 220 44 270 78 C 300 100 286 132 240 138 C 170 148 96 120 70 70 Z',
  'M 96 78 C 138 56 210 60 250 86 C 274 102 262 124 226 128 C 168 134 110 112 96 78 Z',
  'M 40 156 C 70 140 120 150 140 178 C 152 196 132 214 96 208 C 60 202 30 178 40 156 Z',
];

export default function AbstractRouteLine({
  accent = '#8b6bff',
  grid = true,
  markers = true,
  hazard = true,
  progress = null,
  rider = false,
  className,
}) {
  const uid = useId().replace(/:/g, '');
  const pathRef = useRef(null);
  const [len, setLen] = useState(0);
  const [pt, setPt] = useState(null);

  useLayoutEffect(() => {
    if (!pathRef.current) return;
    const L = pathRef.current.getTotalLength();
    setLen(L);
    if (progress != null) {
      setPt(pathRef.current.getPointAtLength(L * progress));
    }
  }, [progress]);

  return (
    <svg
      viewBox="0 0 360 220"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-label="Abstract route map"
    >
      <defs>
        <linearGradient id={`rl-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--rydo-green-bright)" />
          <stop offset="55%" stopColor={accent} />
          <stop offset="100%" stopColor="#a78bff" />
        </linearGradient>
        <filter id={`g-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={`bg-${uid}`} cx="30%" cy="18%" r="80%">
          <stop offset="0%" stopColor="rgba(123,92,255,0.22)" />
          <stop offset="100%" stopColor="rgba(123,92,255,0)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="360" height="220" fill={`url(#bg-${uid})`} />
      {grid ? (
        <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
          {[44, 88, 132, 176].map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="360" y2={y} />
          ))}
          {[60, 120, 180, 240, 300].map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="220" />
          ))}
        </g>
      ) : null}
      <g fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.25">
        {RL_CONTOURS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <path
        d={RL_PATH}
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="7"
        strokeLinecap="round"
        transform="translate(0,2)"
      />
      <path
        ref={pathRef}
        d={RL_PATH}
        fill="none"
        stroke={progress != null ? 'rgba(255,255,255,0.16)' : `url(#rl-${uid})`}
        strokeWidth={progress != null ? 3 : 3.5}
        strokeLinecap="round"
        filter={progress != null ? undefined : `url(#g-${uid})`}
      />
      {progress != null && len > 0 ? (
        <path
          d={RL_PATH}
          fill="none"
          stroke={`url(#rl-${uid})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          filter={`url(#g-${uid})`}
          strokeDasharray={`${(len * progress).toFixed(1)} ${len.toFixed(1)}`}
        />
      ) : null}
      {markers ? (
        <>
          <circle cx="30" cy="188" r="6" fill="var(--rydo-green-bright)" stroke="#0f0f10" strokeWidth="2.5" />
          <g transform="translate(338,58)">
            <circle r="7" fill="#fff" stroke="#0f0f10" strokeWidth="2.5" />
            <circle r="2.5" fill="#0f0f10" />
          </g>
        </>
      ) : null}
      {hazard ? (
        <g transform="translate(255,108)">
          <path
            d="M0 -8 L7 6 L-7 6 Z"
            fill="rgba(240,178,74,0.95)"
            stroke="#0f0f10"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <rect x="-0.9" y="-3.5" width="1.8" height="5" rx="0.9" fill="#0f0f10" />
          <circle cx="0" cy="3.6" r="1.1" fill="#0f0f10" />
        </g>
      ) : null}
      {rider && pt ? (
        <g transform={`translate(${pt.x},${pt.y})`}>
          <circle r="11" fill="rgba(33,241,168,0.18)">
            <animate attributeName="r" values="8;14;8" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle r="6" fill="var(--rydo-green-bright)" stroke="#0f0f10" strokeWidth="2.5" />
        </g>
      ) : null}
    </svg>
  );
}
