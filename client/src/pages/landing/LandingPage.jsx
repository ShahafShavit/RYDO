import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import { ArrowRight, CheckCircle2, MapPinned, RadioTower, TriangleAlert, Users2 } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import Button from '@/shared/components/ui/button/Button';
import Badge from '@/shared/components/ui/badge/Badge';
import Card from '@/shared/components/ui/card/Card';

const featureCards = [
  {
    title: 'Structured GPX repository',
    body: 'A centralized route library with clear metadata, so riders can evaluate routes by terrain, difficulty, distance, and expected ride time.',
    icon: MapPinned,
  },
  {
    title: 'Navigation system',
    body: 'Route-based navigation built for off-road riding, supporting both personal guidance and synchronized group movement.',
    icon: Users2,
  },
  {
    title: 'Live ride awareness',
    body: 'See nearby riders in real time, understand relative positioning, and stay aware without leaving the map.',
    icon: RadioTower,
  },
  {
    title: 'Hazard reporting',
    body: 'Report blocked paths, obstacles, or dangerous sections and share those updates instantly with other riders on the route.',
    icon: TriangleAlert,
  },
];

const productFlow = [
  'Discover a route that fits your terrain, distance, and difficulty',
  'Choose to ride solo or bring others into the plan',
  'Navigate with live context, not guesswork',
  'See riders, route progress, and trail updates in real time',
  'Finish the ride with history, progress, and a clearer next ride',
];

const metrics = [
  { label: 'Survey responses', value: '100+' },
  { label: 'Core capabilities', value: '5' },
  { label: 'One connected platform', value: '1' },
];

/** Matches sticky `AppNavbar` height (`h-18` → 4.5rem). */
const LANDING_STICKY_OFFSET = 72;

/** Lenis programmatic scroll duration (seconds); slightly longer than wheel smoothness for section jumps. */
const SECTION_SCROLL_DURATION = 1.35;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export default function LandingPage() {
  const location = useLocation();
  const rootRef = useRef(null);
  const heroTextRef = useRef(null);
  const heroVisualRef = useRef(null);
  const heroVideoRef = useRef(null);
  const heroBgOverlayRef = useRef(null);
  const featureRefs = useRef([]);
  const lenisRef = useRef(null);

  const scrollLandingSectionIntoView = useCallback((rawId) => {
    const id = String(rawId).replace(/^#/, '');
    const lenis = lenisRef.current;
    const el = document.getElementById(id);
    if (!lenis || !el) return false;
    lenis.scrollTo(el, {
      offset: -LANDING_STICKY_OFFSET,
      duration: SECTION_SCROLL_DURATION,
      easing: easeInOutCubic,
      onComplete: () => {
        ScrollTrigger.refresh();
      },
    });
    return true;
  }, []);

  useLayoutEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      touchMultiplier: 1.2,
    });
    lenisRef.current = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.from(heroTextRef.current?.children || [], {
        y: 36,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: 'power3.out',
      });

      gsap.from(heroVisualRef.current, {
        y: 42,
        opacity: 0,
        duration: 1,
        delay: 0.08,
        ease: 'power3.out',
      });

      gsap.from(featureRefs.current, {
        y: 28,
        opacity: 0,
        duration: 1,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: undefined,
      });

      // Background video fades out as user scrolls the #top section
      gsap.to(heroVideoRef.current, {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '#top',
          scrub: 0.6,
          end: 'bottom center',
        },
      });

      // Overlay fades in to tint the hero using the site's --rydo-bg variable
      gsap.to(heroBgOverlayRef.current, {
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '#top',
          scrub: 0.6,
          end: 'bottom center',
        },
      });
    }, rootRef);

    return () => {
      lenisRef.current = null;
      ctx.revert();
      lenis.destroy();
    };
  }, []);

  useLayoutEffect(() => {
    if (location.pathname !== ROUTES.home) return;
    const id = location.hash?.replace(/^#/, '');
    if (!id) return;

    let cancelled = false;
    let frames = 0;
    const maxFrames = 60;

    const tick = () => {
      if (cancelled) return;
      if (!document.getElementById(id)) return;
      if (scrollLandingSectionIntoView(id)) return;
      frames += 1;
      if (frames < maxFrames) requestAnimationFrame(tick);
    };

    requestAnimationFrame(() => requestAnimationFrame(tick));
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.hash, scrollLandingSectionIntoView]);

  useEffect(() => {
    function onDocumentClickCapture(e) {
      if (location.pathname !== ROUTES.home) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = e.target.closest?.('a[href]');
      if (!a || a.target === '_blank') return;

      let hash = '';
      try {
        const u = new URL(a.href, window.location.origin);
        if (u.pathname !== ROUTES.home) return;
        hash = u.hash.replace(/^#/, '');
      } catch {
        return;
      }
      if (!hash || !document.getElementById(hash)) return;

      const current = location.hash.replace(/^#/, '');
      if (current !== hash) return;

      e.preventDefault();
      e.stopPropagation();
      scrollLandingSectionIntoView(hash);
    }

    document.addEventListener('click', onDocumentClickCapture, true);
    return () => document.removeEventListener('click', onDocumentClickCapture, true);
  }, [location.pathname, location.hash, scrollLandingSectionIntoView]);

  return (
    <div ref={rootRef} className="overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 rydo-grid-noise" />
      <section ref={heroBgOverlayRef} id="top" className="relative min-h-[calc(100vh-72px)] overflow-hidden z-10 bg-(--rydo-bg)/70">
        <video ref={heroVideoRef} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover">
          <source src="/videos/landingPageBg.mp4" type="video/mp4" />
        </video>
        {/* <div ref={heroBgOverlayRef} className="absolute inset-0 bg-(--rydo-bg)/50 z-10 opacity-1" /> */}

        <div className="pointer-events-none absolute inset-x-0 bottom-[-10%] h-95" />
        <div className="pointer-events-none absolute right-[10%] top-[12%] h-72 w-72 rounded-full bg-rydo-purple/14 blur-[120px]" />
        <div className="pointer-events-none absolute left-[6%] top-[24%] h-56 w-56 rounded-full bg-rydo-green/8 blur-[120px]" />

        <div className="relative z-10 w-full">
          <div className="rydo-container grid min-h-[calc(100vh-72px)] items-center gap-20 py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(400px,0.95fr)] lg:py-24">
            <div ref={heroTextRef} className="space-y-7">
              <Badge variant="neon" className="w-fit">Built for riders. Made for real trails.</Badge>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] md:text-6xl xl:text-7xl">
                  RYDO without the <span className="text-rydo-purple">chaos</span>.
                </h1>
                <p className="max-w-2xl text-lg leading-6 text-fg/68 md:text-xl">
                  Discover routes, navigate the trail, track live riders, and stay updated on real conditions - without jumping between apps.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to={ROUTES.register}><Button variant="neon" size="lg">Get started <ArrowRight size={18} /></Button></Link>
                <Link to={{ pathname: ROUTES.home, hash: '#features' }}><Button variant="secondary" size="lg">See how it works</Button></Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {metrics.map((item) => (
                  <Card key={item.label} className="p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-fg-subtle">{item.label}</p>
                    <p className="mt-3 text-3xl font-semibold">{item.value}</p>
                  </Card>
                ))}
              </div>
            </div>

            <div ref={heroVisualRef} className="relative">
              <div className="absolute left-1 top-16 hidden z-1 lg:block">
                <Badge variant="success">Live rider sync</Badge>
              </div>
              <div className="absolute right-4 top-0 hidden z-1 lg:block">
                <Badge>Hazard updates</Badge>
              </div>
              <div className="absolute -bottom-8 left-6 hidden z-1 lg:block">
                <Badge variant="neon">Structured GPX routes</Badge>
              </div>


              <div className="relative p-0 w-fit justify-self-center bg-black/85 rounded-[50px]">
                <img src="/mockups/userHomeMockup.png"
                  alt="Hero visual showcasing the RYDO web interface with route details, group chat and live rider map."
                  className="w-70" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="overview" className="rydo-section">
        <div className="rydo-container grid gap-8 lg:grid-cols-[0.9fr_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Problem</p>
            <h2 className="text-4xl font-semibold leading-tight">One ride. Too many tools.</h2>
          </div>
          <Card>
            <p className="text-lg leading-8 text-fg/68">
              Riders still piece together routes, navigation, communication, and trail updates across disconnected platforms. RYDO brings those critical parts into one structured system — so the ride feels connected before it starts, while it happens, and after it ends.
            </p>
          </Card>
        </div>
      </section>

      <section id="why-rydo" className="rydo-section">
        <div className="rydo-container grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['One connected experience', 'Routes, navigation, coordination, and updates work together instead of living in separate apps.'],
            ['Clear route decisions', 'Terrain, difficulty, distance, and ride time are structured up front — before you commit.'],
            ['Built for solo and group rides', 'Use it independently or with others without changing the core experience.'],
            ['Trail context in real time', 'Live riders and hazard updates keep the ride grounded in what is actually happening.'],
          ].map(([title, body], index) => (
            <Card key={title} ref={(node) => { featureRefs.current[index] = node; }}>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-fg-muted">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="features" className="rydo-section">
        <div className="rydo-container space-y-8">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Features</p>
            <h2 className="text-4xl font-semibold">Everything riders actually need. In one place.</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="p-7">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-rydo-purple/25 bg-rydo-purple/12">
                      <Icon size={22} className="text-rydo-purple" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold">{feature.title}</h3>
                      <p className="mt-3 max-w-xl text-fg/62">{feature.body}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="product-flow" className="rydo-section">
        <div className="rydo-container grid gap-8 lg:grid-cols-[0.85fr_minmax(0,1.15fr)]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Product Flow</p>
            <h2 className="text-4xl font-semibold">From route discovery to ride completion.</h2>
            <p className="max-w-xl text-fg-muted">A single flow for planning, navigating, staying aware, and carrying the ride forward.</p>
          </div>
          <Card className="space-y-4">
            {productFlow.map((step, index) => (
              <div key={step} className="flex items-center gap-4 rounded-2xl border border-border bg-black/20 px-4 py-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-rydo-purple/25 bg-rydo-purple/10 text-sm font-semibold text-fg">{index + 1}</div>
                <p className="text-fg/76">{step}</p>
              </div>
            ))}
          </Card>
        </div>
      </section>

      <section id="technology" className="rydo-section">
        <div className="rydo-container grid gap-6 lg:grid-cols-3">
          <Card>
            <h3 className="text-2xl font-semibold">GPS continuity</h3>
            <p className="mt-3 text-fg/62">Stable positioning and smoother location handling built to reduce jumps, noise, and uncertainty on the trail.</p>
          </Card>
          <Card>
            <h3 className="text-2xl font-semibold">Offline-ready navigation</h3>
            <p className="mt-3 text-fg/62">Download maps and routes in advance so navigation remains available even when coverage disappears.</p>
          </Card>
          <Card>
            <h3 className="text-2xl font-semibold">Live awareness</h3>
            <p className="mt-3 text-fg/62">Real-time rider updates designed for visibility, low latency, and practical battery usage during active rides.</p>
          </Card>
        </div>
      </section>

      <section className="pb-20 pt-8">
        <div className="rydo-container">
          <Card className="flex flex-col gap-8 p-8 md:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Next move</p>
              <h2 className="mt-3 text-4xl font-semibold">Less switching. More riding.</h2>
              <p className="mt-4 text-fg-muted">RYDO brings route discovery, navigation, rider awareness, and trail updates into one cycling platform built for real use.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to={ROUTES.register}><Button variant="neon" size="lg">Create account</Button></Link>
              <Link to={ROUTES.login}><Button variant="secondary" size="lg">Open the platform</Button></Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
