import { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Home as HomeIcon, Trees, Store, ShieldCheck, LayoutList, SlidersHorizontal,
  MapPin, ArrowRight, Search, Handshake, CalendarCheck, Sparkles,
} from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useOrbitMode, OrbitRing, OrbitCarousel } from '../components/PropertyOrbit.jsx';
import PropertySearchBar from '../components/PropertySearchBar.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import BrokerCard from '../components/BrokerCard.jsx';
import ReviewCard from '../components/ReviewCard.jsx';
import Reveal from '../components/Reveal.jsx';
import { ErrorMessage, EmptyState } from '../components/StateViews.jsx';
import { toQuery } from '../services/api.js';

// Search shortcuts shown when the database has fewer than 6 areas with listings.
// These are NOT claims about popularity; they only link to searches.
const DEFAULT_LOCATIONS = [
  { city: 'Dhaka', area: '' }, { city: 'Dhaka', area: 'Uttara' }, { city: 'Dhaka', area: 'Bashundhara' },
  { city: 'Dhaka', area: 'Mirpur' }, { city: 'Chattogram', area: '' }, { city: 'Sylhet', area: '' },
  
];


const LOCATION_IMAGES = {
  Dhaka: 'https://commons.wikimedia.org/wiki/Special:FilePath/Dhaka_Skyline.jpg',
  Uttara: 'https://commons.wikimedia.org/wiki/Special:FilePath/Uttara%2C_Dhaka%2C_Bangladesh.jpg',
  Bashundhara: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bashundhara_Residential_Area_Day.jpg',
  Mirpur: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mirpur.jpg',
  Chattogram: 'https://commons.wikimedia.org/wiki/Special:FilePath/Chittagong_city_skyline.jpg',
  Sylhet: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sylhet_city_01.jpg',
};

const TYPES = [
  { key: 'apartment', label: 'Apartments', icon: Building2, text: 'Flats in residential towers' },
  { key: 'house', label: 'Houses', icon: HomeIcon, text: 'Family homes and duplexes' },
  { key: 'land', label: 'Land', icon: Trees, text: 'Plots to build or invest in' },
  { key: 'commercial', label: 'Commercial', icon: Store, text: 'Shops, offices and floors' },
];

const eyebrow = 'text-xs font-semibold uppercase tracking-[0.2em]';

export default function Home() {
  const mode = useOrbitMode();
  const orbit = mode === 'orbit';
  const contentRef = useRef(null); // the headline + search block that orbiting cards must not cover
  const { user } = useAuth();
  const props = useApi('/properties?limit=12');
  const locations = useApi('/properties/locations');
  const stats = useApi('/public/stats');
  const brokers = useApi('/brokers?limit=4');
  const reviews = useApi('/public/reviews/recent?limit=3');

  const items = props.data?.items || [];
  const orbitItems = items.slice(0, 7);
  const featured = items.slice(0, 6);
  const s = stats.data;

  return (
    <div>
      {/* ───────── B. HERO WITH CIRCULAR PROPERTY ORBIT ───────── */}
      <section className="relative overflow-hidden bg-midnight text-ivory" aria-labelledby="hero-title">
        {/* architectural grid texture */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'linear-gradient(#F7F5F0 1px, transparent 1px), linear-gradient(90deg, #F7F5F0 1px, transparent 1px)', backgroundSize: '96px 96px' }} />

        <div className={`relative mx-auto max-w-[1400px] px-4 sm:px-6 ${orbit ? 'flex min-h-[940px] items-center justify-center py-28' : 'pb-10 pt-28'}`}>
          {orbit && orbitItems.length > 0 && <OrbitRing properties={orbitItems} avoidRef={contentRef} />}

          {/* soft vignette: cards fade into the background behind the text so it stays readable */}
          {orbit && (
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[25] h-[620px] w-[760px] -translate-x-1/2 -translate-y-1/2"
              style={{ background: 'radial-gradient(closest-side, rgba(16,24,32,0.7) 45%, rgba(16,24,32,0) 100%)' }} />
          )}

          <div ref={contentRef} className="relative z-30 mx-auto w-full max-w-xl text-center">
            <p className={`${eyebrow} text-gold`}>EstateHub · Bangladesh</p>
            <h1 id="hero-title" className="mt-4 text-5xl font-semibold leading-[1.05] sm:text-6xl">
              Find a Place That Feels Like <em className="font-medium italic text-gold">Home.</em>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base text-ivory/80">
              Discover exceptional properties, connect with trusted brokers, and find your next place with EstateHub.
            </p>
            <div className="mt-8">
              <PropertySearchBar locations={locations.data || []} />
            </div>
          </div>
        </div>

        {!orbit && orbitItems.length > 0 && <OrbitCarousel properties={orbitItems} />}
        {props.error && <div className="relative z-10 mx-auto max-w-xl px-4 pb-10"><ErrorMessage message={props.error} onRetry={props.reload} /></div>}
      </section>

      {/* ───────── C. TRUST & PLATFORM HIGHLIGHTS ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="highlights">
        <Reveal>
          <p className={`${eyebrow} text-forest`}>Why EstateHub</p>
          <h2 id="highlights" className="mt-2 max-w-2xl text-4xl">A calmer way to look for property</h2>
        </Reveal>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: 'Reviewed brokers', text: 'Brokers appear in our directory after an admin has reviewed their account.',
              stat: s && s.verifiedBrokers > 0 ? `${s.verifiedBrokers} verified broker${s.verifiedBrokers === 1 ? '' : 's'}` : null },
            { icon: LayoutList, title: 'Detailed listings', text: 'Size, rooms, price and area on every listing, with a photo gallery and the broker one click away.',
              stat: s && s.activeListings > 0 ? `${s.activeListings} active listing${s.activeListings === 1 ? '' : 's'}` : null },
            { icon: SlidersHorizontal, title: 'Personalized discovery', text: 'Filter by location, type, budget and size, and save your search with a single link.', stat: null },
          ].map((h, i) => (
            <Reveal key={h.title} delay={i * 0.1}>
              <div className="border-t-2 border-gold pt-5">
                <h.icon className="h-7 w-7 text-forest" aria-hidden="true" />
                <h3 className="mt-4 text-2xl">{h.title}</h3>
                <p className="mt-2 text-gray-600">{h.text}</p>
                {h.stat && <p className="mt-3 text-sm font-semibold text-forest">{h.stat}</p>}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── D. FEATURED PROPERTIES ───────── */}
      <section className="bg-white py-20" aria-labelledby="featured">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={`${eyebrow} text-forest`}>Featured</p>
              <h2 id="featured" className="mt-2 text-4xl">Newest approved listings</h2>
            </div>
            <Link to="/properties" className="flex items-center gap-1 text-sm font-semibold text-forest hover:text-gold">
              View all properties <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>
          {props.error && <div className="mt-8"><ErrorMessage message={props.error} onRetry={props.reload} /></div>}
          {!props.error && !props.loading && featured.length === 0 && (
            <EmptyState title="No listings yet" message="Approved listings will appear here." />
          )}
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 0.08}><PropertyCard property={p} /></Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── E. EXPLORE BY PROPERTY TYPE ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="types">
        <Reveal>
          <p className={`${eyebrow} text-forest`}>Browse</p>
          <h2 id="types" className="mt-2 text-4xl">Explore by property type</h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TYPES.map((t, i) => {
            const count = s?.byCategory?.[t.key];
            return (
              <Reveal key={t.key} delay={i * 0.08}>
                <Link to={`/properties${toQuery({ category: t.key })}`}
                  className="group flex h-full min-h-[220px] flex-col justify-between bg-midnight p-6 text-ivory transition-colors hover:bg-forest">
                  <t.icon className="h-9 w-9 text-gold" aria-hidden="true" />
                  <div>
                    <h3 className="text-3xl">{t.label}</h3>
                    <p className="mt-1 text-sm text-ivory/70">{t.text}</p>
                    <p className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-gold">{count ? `${count} listing${count === 1 ? '' : 's'}` : 'Browse'}</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ───────── F. DISCOVER LOCATIONS ───────── */}
      <LocationsSection areas={s?.topAreas || []} />

      {/* ───────── G. TRUSTED BROKERS ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="brokers">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`${eyebrow} text-forest`}>Brokers</p>
            <h2 id="brokers" className="mt-2 text-4xl">Meet trusted brokers</h2>
          </div>
          <Link to="/brokers" className="flex items-center gap-1 text-sm font-semibold text-forest hover:text-gold">
            Find a broker <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Reveal>
        {brokers.error && <div className="mt-8"><ErrorMessage message={brokers.error} onRetry={brokers.reload} /></div>}
        {brokers.data && brokers.data.items.length === 0 && (
          <EmptyState title="No verified brokers yet" message="Verified brokers will be listed here." />
        )}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(brokers.data?.items || []).map((b, i) => (
            <Reveal key={b.id} delay={i * 0.08}><BrokerCard broker={b} /></Reveal>
          ))}
        </div>
      </section>

      {/* ───────── H. ESTATEAI SECTION ───────── */}
      <section className="bg-midnight py-20 text-ivory" aria-labelledby="ai">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <p className={`${eyebrow} text-gold`}>EstateAI</p>
            <h2 id="ai" className="mt-2 text-4xl sm:text-5xl">Describe what you want. Get real matches.</h2>
            <p className="mt-4 max-w-lg text-ivory/80">
              EstateAI turns a sentence into search filters and looks them up in our listings. It never invents
              properties, prices or brokers, and it tells you when it had to relax a requirement.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-sm border border-gold/40 px-3 py-1.5 text-sm text-gold">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Launching in a later update
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-sm border border-white/10 bg-white/5 p-5" aria-label="Illustration of the EstateAI chat (preview only)">
              <p className="mb-4 text-[11px] uppercase tracking-widest text-ivory/50">Preview · illustration only</p>
              <div className="ml-auto max-w-[85%] rounded-sm bg-gold px-4 py-3 text-sm text-midnight">
                I need a three-bedroom apartment in Uttara, Dhaka, under 80 lakh taka.
              </div>
              <div className="mt-4 max-w-[90%] rounded-sm bg-white/10 px-4 py-3 text-sm">
                <p>Here is what I understood. I will search real listings for:</p>
                <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                  {['Area: Uttara', 'City: Dhaka', 'Type: Apartment', 'Bedrooms: 3+', 'Max budget: ৳80 Lakh'].map((c) => (
                    <li key={c} className="rounded-sm border border-gold/50 px-2 py-1 text-gold">{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────── I. REVIEWS ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="reviews">
        <Reveal>
          <p className={`${eyebrow} text-forest`}>Reviews</p>
          <h2 id="reviews" className="mt-2 text-4xl">What clients say about brokers</h2>
        </Reveal>
        {reviews.error && <div className="mt-8"><ErrorMessage message={reviews.error} onRetry={reviews.reload} /></div>}
        {reviews.data && reviews.data.length === 0 && (
          <EmptyState title="No reviews yet" message="Reviews appear here after clients submit them." />
        )}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {(reviews.data || []).map((r, i) => (
            <Reveal key={r.id} delay={i * 0.08}><ReviewCard review={r} /></Reveal>
          ))}
        </div>
      </section>

      {/* ───────── J. HOW IT WORKS ───────── */}
      <section className="bg-white py-20" aria-labelledby="how">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <p className={`${eyebrow} text-forest`}>How it works</p>
            <h2 id="how" className="mt-2 text-4xl">Three simple steps</h2>
          </Reveal>
          <div role="list" className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { icon: Search, title: 'Search for a property', text: 'Use the search bar or filters to narrow down location, type, budget and size.' },
              { icon: Handshake, title: 'Compare and contact a broker', text: 'Open listings side by side and get in touch with the broker who listed the property.' },
              { icon: CalendarCheck, title: 'Arrange a viewing', text: 'Agree a time with the broker, or discuss the property further before you decide.' },
            ].map((step, i) => (
              <Reveal key={step.title} delay={i * 0.1}>
                <div role="listitem" className="relative border-l border-gold pl-6">
                  <span className="font-serif text-6xl text-gold/70" aria-hidden="true">{i + 1}</span>
                  <step.icon className="mt-2 h-6 w-6 text-forest" aria-hidden="true" />
                  <h3 className="mt-3 text-2xl">{step.title}</h3>
                  <p className="mt-2 text-gray-600">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── K. FINAL CALL TO ACTION ───────── */}
      <section className="bg-forest py-20 text-ivory" aria-labelledby="cta">
        <Reveal className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 id="cta" className="text-4xl sm:text-5xl">Ready to list, or ready to look?</h2>
          <p className="mx-auto mt-4 max-w-xl text-ivory/80">
            Brokers can publish listings for review. Everyone else can start exploring available properties today.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to={user?.role === 'broker' ? '/broker' : '/register?role=broker'} className="rounded-sm bg-gold px-6 py-3 font-semibold text-midnight hover:bg-[#d4b57f]">
              {user?.role === 'broker' ? 'Go to my dashboard' : 'Publish your listings'}
            </Link>
            <Link to="/properties" className="rounded-sm border border-ivory/60 px-6 py-3 font-semibold hover:border-gold hover:text-gold">
              Explore properties
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

// F. Popular locations: real areas first (by listing count), then default search shortcuts up to 6.
function LocationsSection({ areas }) {
  const real = areas.map((a) => ({
  city: a.city,
  area: a.area,
  count: a.count,
  image: LOCATION_IMAGES[a.area] || LOCATION_IMAGES[a.city] || a.image || LOCATION_IMAGES.Dhaka,
}));
  const seen = new Set(real.map((a) => `${a.city}|${a.area}`));
  const extras = DEFAULT_LOCATIONS
  .filter((d) => !seen.has(`${d.city}|${d.area}`))
  .map((d) => ({
    ...d,
    image: LOCATION_IMAGES[d.area] || LOCATION_IMAGES[d.city] || LOCATION_IMAGES.Dhaka,
  }));;
  const list = [...real, ...extras].slice(0, 6);

  return (
    <section className="bg-ivory pb-20" aria-labelledby="locations">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <p className={`${eyebrow} text-forest`}>Locations</p>
          <h2 id="locations" className="mt-2 text-4xl">Discover popular locations</h2>
          <p className="mt-2 text-sm text-gray-600">Ordered by the number of active listings on EstateHub.</p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((l, i) => {
            const name = l.area || l.city;
            const query = l.area ? { city: l.city, area: l.area } : { city: l.city };
            return (
              <Reveal key={`${l.city}-${l.area}`} delay={(i % 3) * 0.08}>
                <Link to={`/properties${toQuery(query)}`} className="group relative block aspect-[16/10] overflow-hidden bg-midnight text-ivory">
                  {l.image && <img src={l.image || LOCATION_IMAGES.Dhaka}
                              alt={`${l.area || l.city} location`}
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105"/>}
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-midnight/90 via-midnight/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="flex items-center gap-1 text-xs uppercase tracking-widest text-gold"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{l.area ? l.city : 'Bangladesh'}</p>
                    <h3 className="mt-1 text-3xl">{name}</h3>
                    <p className="text-sm text-ivory/80">{l.count ? `${l.count} active listing${l.count === 1 ? '' : 's'}` : 'Search listings'}</p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
