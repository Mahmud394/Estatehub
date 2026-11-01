import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, BedDouble, Bath } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { formatPrice, formatSize, CATEGORY_LABELS } from '../utils/format.js';
import Avatar from './Avatar.jsx';
import { getPropertyCardImage } from '../utils/propertyImages.js';
// ---------------------------------------------------------------------------
// PropertyOrbit: the signature hero element.
//
// How it works (explained for the project defense):
//  * Each card sits on an ellipse:  x = cos(angle) * rx,  y = sin(angle) * ry.
//  * One requestAnimationFrame loop advances the angle and writes only
//    `transform` + `z-index` to the cards. Transforms do not trigger layout,
//    so nothing around the hero shifts. React state is NOT used per frame.
//  * Cards at the back (top of the ellipse) are slightly smaller and lower in
//    z-order than cards at the front, which gives a feeling of depth.
//  * A circle around a tall block of text always crosses the text's corners, so cards
//    pass BEHIND the headline/search form and fade out in proportion to how much of
//    the card is covered. The text always stays readable, and the orbit still feels continuous.
//  * Hovering or keyboard-focusing a card stops the orbit and enlarges that card.
//    When the pointer leaves, the speed eases back up so it never jerks.
//  * Small screens and "prefers-reduced-motion" users get a plain scrollable
//    carousel instead (no animation at all).
// ---------------------------------------------------------------------------

const CARD_W = 240;
const CARD_H = 240;
const SECONDS_PER_REVOLUTION = 90;
const START_ANGLE = 0.35;



const smoothstep = (lo, hi, v) => { const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo))); return t * t * (3 - 2 * t); };

// 'orbit' on wide screens with motion allowed, otherwise 'carousel'.
export function useOrbitMode() {
  const wide = useMediaQuery('(min-width: 1200px)'); // below this the orbit gets too crowded
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  return wide && !reduced ? 'orbit' : 'carousel';
}

// One property card (shared by the orbit and the carousel)
function HeroCard({ property: p, orbit }) {
  return (
    <Link
      to={`/properties/${p.id}`}
      aria-label={`${p.title}, ${p.area}, ${formatPrice(p.price, p.purpose)}`}
      className={`group relative block h-full w-full overflow-hidden rounded-full bg-white text-midnight shadow-xl ring-1 ring-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
        orbit
          ? 'transition-[transform,box-shadow] duration-300 ease-out hover:scale-[1.12] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)] focus-visible:scale-[1.12]'
          : ''
      }`}
    >
      <div className="absolute inset-0">
        <img
          src={getPropertyCardImage(p)}
          alt={p.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/45 to-midnight/10" />
      </div>

      <span className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-midnight/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold">
        {p.purpose === 'sale' ? 'Sale' : 'Rent'}
      </span>

      <div className="absolute inset-x-3 bottom-5 flex flex-col items-center text-center text-white">
        <p className="font-serif text-xl font-bold leading-tight text-gold">
          {formatPrice(p.price, p.purpose)}
        </p>

        <h3 className="mt-1 max-w-full truncate text-sm font-semibold">
          {p.title}
        </h3>

        <p className="mt-1 max-w-full truncate text-[11px] text-white/90">
          {p.area}, {p.city}
        </p>

        <p className="mt-1 text-[10px] text-white/75">
          {CATEGORY_LABELS[p.category]} · {formatSize(p.size)}
        </p>

        <div className="mt-2 flex items-center gap-1.5">
          <Avatar
            name={p.broker.name}
            url={p.broker.avatarUrl}
            tone="gold"
            className="h-6 w-6 text-[9px]"
          />
          <span className="max-w-[110px] truncate text-[10px] text-white/90">
            {p.broker.name}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-3 text-[10px] text-white/90">
          {p.bedrooms != null && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3 w-3" aria-hidden="true" />
              {p.bedrooms}
            </span>
          )}

          {p.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3" aria-hidden="true" />
              {p.bathrooms}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Wide-screen orbit. Must sit inside a `relative` parent; it fills that parent.
export function OrbitRing({ properties, avoidRef }) {
  const box = useRef(null);
  const guide = useRef(null);
  const itemRefs = useRef([]);
  const [userPaused, setUserPaused] = useState(false);
  const pausedRef = useRef(false);
  const sim = useRef({ angle: 0, speed: 1, hovering: 0, hoveredIndex: -1, rx: 500, ry: 300, w: 1200, h: 900, avoid: null, scales: [], fades: [] });

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setUserPaused(pausedRef.current);
  };

  useLayoutEffect(() => {
    const el = box.current;
    const s = sim.current;
    const n = properties.length;
    let raf;
    let last = performance.now();

    const measure = () => {
      const r = el.getBoundingClientRect();
      s.w = r.width;
      s.h = r.height;
      const c = avoidRef?.current?.getBoundingClientRect();
      s.avoid = c ? { l: c.left - r.left - 12, r: c.right - r.left + 12, t: c.top - r.top - 12, b: c.bottom - r.top + 12 } : null;
      s.rx = Math.max(220, r.width / 2 - CARD_W / 2 - 24);
      s.ry = Math.max(160, r.height / 2 - CARD_H / 2 - 28);
      if (guide.current) {
        guide.current.style.width = `${s.rx * 2}px`;
        guide.current.style.height = `${s.ry * 2}px`;
      }
    };

    const place = (dt) => {
      for (let i = 0; i < n; i += 1) {
        const node = itemRefs.current[i];
        if (!node) continue;
        const a = s.angle + (i / n) * Math.PI * 2 + START_ANGLE;
        const depth = (Math.sin(a) + 1) / 2; // 0 = far (top), 1 = near (bottom)
        const target = s.hoveredIndex === i ? 1 : 0.84 + 0.16 * depth;
        const prev = s.scales[i] ?? target;
        s.scales[i] = prev + (target - prev) * Math.min(1, dt * 10); // eased, so hover never "pops"
        const x = Math.cos(a) * s.rx;
        const y = Math.sin(a) * s.ry;
        node.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s.scales[i]})`;

        // How much of this card is covered by the text block? 0 = none, 1 = all of it.
        let fadeTarget = 1;
        if (s.avoid && s.hoveredIndex !== i) {
          const hw = (CARD_W * s.scales[i]) / 2;
          const hh = (CARD_H * s.scales[i]) / 2;
          const cx = s.w / 2 + x;
          const cy = s.h / 2 + y;
          const ox = Math.max(0, Math.min(cx + hw, s.avoid.r) - Math.max(cx - hw, s.avoid.l));
          const oy = Math.max(0, Math.min(cy + hh, s.avoid.b) - Math.max(cy - hh, s.avoid.t));
          fadeTarget = 1 - 0.9 * smoothstep(0.02, 0.3, (ox * oy) / (4 * hw * hh));
        }
        const fPrev = s.fades[i] ?? fadeTarget;
        s.fades[i] = fPrev + (fadeTarget - fPrev) * Math.min(1, dt * 8);
        node.style.opacity = s.fades[i].toFixed(3);
        node.style.zIndex = String(10 + Math.round(depth * 10)); // hovered card overrides via CSS (!z-35: above text, below navbar)
      }
    };

    let observedAvoid = false;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!observedAvoid && avoidRef?.current) { // the text block mounts after us, so pick it up on the first frame
        observedAvoid = true;
        ro.observe(avoidRef.current);
        measure();
      }
      if (s.hovering > 0 || pausedRef.current) s.speed = 0; // stop instantly so the hovered card is steady
      else s.speed += (1 - s.speed) * Math.min(1, dt * 2.5); // ease back up smoothly
      s.angle += s.speed * dt * ((Math.PI * 2) / SECONDS_PER_REVOLUTION);
      place(dt);
      raf = requestAnimationFrame(tick);
    };

    measure();
    place(1);
    const ro = new ResizeObserver(() => { measure(); place(1); });
    ro.observe(el);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [properties.length]);

  const enter = (i) => { sim.current.hovering += 1; sim.current.hoveredIndex = i; };
  const leave = () => {
    const s = sim.current;
    s.hovering = Math.max(0, s.hovering - 1);
    if (s.hovering === 0) s.hoveredIndex = -1;
  };

  return (
    <div ref={box} className="pointer-events-none absolute inset-0">
      {/* faint guide line showing the orbit path (decorative) */}
      <div ref={guide} aria-hidden="true" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-gold/15" />

      <ul aria-label="Featured properties">
        {properties.map((p, i) => (
          <li
            key={p.id}
            ref={(node) => { itemRefs.current[i] = node; }}
            onMouseEnter={() => enter(i)}
            onMouseLeave={leave}
            onFocus={() => enter(i)}
            onBlur={leave}
            className="pointer-events-auto absolute left-1/2 top-1/2 will-change-transform hover:!z-[35] focus-within:!z-[35]"
            style={{ width: CARD_W, height: CARD_H, marginLeft: -CARD_W / 2, marginTop: -CARD_H / 2 }}
          >
            <HeroCard property={p} orbit />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={togglePause}
        aria-pressed={userPaused}
        className="pointer-events-auto absolute bottom-5 right-5 z-40 flex items-center gap-2 rounded border border-white/20 bg-midnight/70 px-3 py-1.5 text-xs text-ivory backdrop-blur hover:border-gold"
      >
        {userPaused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
        {userPaused ? 'Play orbit' : 'Pause orbit'}
      </button>
    </div>
  );
}

// Small-screen / reduced-motion alternative: horizontally scrollable, snaps to cards, no animation.
export function OrbitCarousel({ properties }) {
  return (
    <div className="relative z-10 pb-12">
      <ul
        aria-label="Featured properties"
        tabIndex={0}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-6 min-[1200px]:mx-auto min-[1200px]:max-w-7xl min-[1200px]:justify-center"
      >
        {properties.map((p) => (
          <li key={p.id} className="h-[240px] w-[240px] shrink-0 snap-center">
            <HeroCard property={p} orbit={false} />
          </li>
        ))}
      </ul>
    </div>
  );
}
