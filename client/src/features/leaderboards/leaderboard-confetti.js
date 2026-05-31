const RYDO_COLORS = ['#21F1A8', '#7B5CFF', '#F0B24A', '#FFFFFF', '#C3CDD7'];

/**
 * Lightweight one-shot canvas confetti. Each call uses its own canvas so bursts can overlap.
 * @param {{ intensity?: 'subtle' | 'celebration', originY?: number }} [options]
 * @returns {() => void} cleanup
 */
export function burstLeaderboardConfetti(options = {}) {
  if (typeof window === 'undefined') return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const { intensity = 'subtle', originY = 0.32 } = options;
  const count = intensity === 'celebration' ? 72 : 40;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:fixed;inset:0;z-index:1000;pointer-events:none;width:100%;height:100%;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return () => {};
  }

  const dpr = window.devicePixelRatio || 1;
  const layoutW = window.innerWidth;
  const layoutH = window.innerHeight;
  canvas.width = layoutW * dpr;
  canvas.height = layoutH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const originX = layoutW * 0.5;
  const originYpx = layoutH * originY;

  const particles = Array.from({ length: count }, () => {
    const angle = (Math.random() - 0.5) * Math.PI * 1.1;
    const speed = intensity === 'celebration' ? 5 + Math.random() * 8 : 3.5 + Math.random() * 5.5;
    return {
      x: originX + (Math.random() - 0.5) * layoutW * 0.28,
      y: originYpx,
      vx: Math.sin(angle) * speed,
      vy: -Math.abs(Math.cos(angle)) * speed - (1.5 + Math.random() * 2),
      size: 3 + Math.random() * 4,
      color: RYDO_COLORS[Math.floor(Math.random() * RYDO_COLORS.length)],
      rotation: Math.random() * 360,
      spin: (Math.random() - 0.5) * 12,
      gravity: 0.16 + Math.random() * 0.06,
      drag: 0.988,
      life: 1,
      decay: 0.006 + Math.random() * 0.004,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
    };
  });

  let frameId = 0;
  let stopped = false;
  const maxMs = intensity === 'celebration' ? 2800 : 2200;
  const startedAt = performance.now();

  const tick = (now) => {
    if (stopped) return;
    ctx.clearRect(0, 0, layoutW, layoutH);

    let alive = 0;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive += 1;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      p.life -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (alive > 0 && now - startedAt < maxMs) {
      frameId = window.requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  };

  frameId = window.requestAnimationFrame(tick);

  const timeout = window.setTimeout(() => {
    stopped = true;
    canvas.remove();
  }, maxMs + 200);

  return () => {
    stopped = true;
    window.cancelAnimationFrame(frameId);
    window.clearTimeout(timeout);
    canvas.remove();
  };
}
