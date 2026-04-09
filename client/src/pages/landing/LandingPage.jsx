import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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

export default function LandingPage() {
  const rootRef = useRef(null);
  const heroTextRef = useRef(null);
  const heroVisualRef = useRef(null);
  const heroVideoRef = useRef(null);
  const heroBgOverlayRef = useRef(null);
  const featureRefs = useRef([]);

  useLayoutEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      touchMultiplier: 1.2,
    });

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
      ctx.revert();
      lenis.destroy();
    };
  }, []);

  return (
    <div ref={rootRef} className="overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 rydo-grid-noise" />
      <section ref={heroBgOverlayRef} id="top" className="relative min-h-[calc(100vh-72px)] overflow-hidden z-10 bg-(--rydo-bg)/70">
        <video ref={heroVideoRef} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover">
          <source src="/videos/landingPageBg.mp4" type="video/mp4" />
        </video>
        {/* <div ref={heroBgOverlayRef} className="absolute inset-0 bg-(--rydo-bg)/50 z-10 opacity-1" /> */}

        <div className="pointer-events-none absolute inset-x-0 bottom-[-10%] h-95" />
        <div className="pointer-events-none absolute right-[10%] top-[12%] h-72 w-72 rounded-full bg-[#7B5CFF]/14 blur-[120px]" />
        <div className="pointer-events-none absolute left-[6%] top-[24%] h-56 w-56 rounded-full bg-[#21F1A8]/8 blur-[120px]" />

        <div className="relative z-10 w-full">
          <div className="rydo-container grid min-h-[calc(100vh-72px)] items-center gap-20 py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(400px,0.95fr)] lg:py-24">
            <div ref={heroTextRef} className="space-y-7">
              <Badge variant="neon" className="w-fit">Built for riders. Made for real trails.</Badge>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] md:text-6xl xl:text-7xl">
                  RYDO without the <span className="text-[#7B5CFF]">chaos</span>.
                </h1>
                <p className="max-w-2xl text-lg leading-6 text-white/68 md:text-xl">
                  Discover routes, navigate the trail, track live riders, and stay updated on real conditions - without jumping between apps.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to={ROUTES.register}><Button variant="neon" size="lg">Get started <ArrowRight size={18} /></Button></Link>
                <a href="#features"><Button variant="secondary" size="lg">See how it works</Button></a>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {metrics.map((item) => (
                  <Card key={item.label} className="p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/42">{item.label}</p>
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
            <p className="text-xs uppercase tracking-[0.16em] text-white/42">Problem</p>
            <h2 className="text-4xl font-semibold leading-tight">One ride. Too many tools.</h2>
          </div>
          <Card>
            <p className="text-lg leading-8 text-white/68">
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
              <p className="mt-3 text-sm leading-7 text-white/60">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="features" className="rydo-section">
        <div className="rydo-container space-y-8">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.16em] text-white/42">Features</p>
            <h2 className="text-4xl font-semibold">Everything riders actually need. In one place.</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {featureCards.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="p-7">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#7B5CFF]/25 bg-[#7B5CFF]/12">
                      <Icon size={22} className="text-[#7B5CFF]" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold">{feature.title}</h3>
                      <p className="mt-3 max-w-xl text-white/62">{feature.body}</p>
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
            <p className="text-xs uppercase tracking-[0.16em] text-white/42">Product Flow</p>
            <h2 className="text-4xl font-semibold">From route discovery to ride completion.</h2>
            <p className="max-w-xl text-white/64">A single flow for planning, navigating, staying aware, and carrying the ride forward.</p>
          </div>
          <Card className="space-y-4">
            {productFlow.map((step, index) => (
              <div key={step} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#7B5CFF]/25 bg-[#7B5CFF]/10 text-sm font-semibold text-white">{index + 1}</div>
                <p className="text-white/76">{step}</p>
              </div>
            ))}
          </Card>
        </div>
      </section>

      <section id="technology" className="rydo-section">
        <div className="rydo-container grid gap-6 lg:grid-cols-3">
          <Card>
            <h3 className="text-2xl font-semibold">GPS continuity</h3>
            <p className="mt-3 text-white/62">Stable positioning and smoother location handling built to reduce jumps, noise, and uncertainty on the trail.</p>
          </Card>
          <Card>
            <h3 className="text-2xl font-semibold">Offline-ready navigation</h3>
            <p className="mt-3 text-white/62">Download maps and routes in advance so navigation remains available even when coverage disappears.</p>
          </Card>
          <Card>
            <h3 className="text-2xl font-semibold">Live awareness</h3>
            <p className="mt-3 text-white/62">Real-time rider updates designed for visibility, low latency, and practical battery usage during active rides.</p>
          </Card>
        </div>
      </section>

      <section className="pb-20 pt-8">
        <div className="rydo-container">
          <Card className="flex flex-col gap-8 p-8 md:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.16em] text-white/42">Next move</p>
              <h2 className="mt-3 text-4xl font-semibold">Less switching. More riding.</h2>
              <p className="mt-4 text-white/64">RYDO brings route discovery, navigation, rider awareness, and trail updates into one cycling platform built for real use.</p>
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
