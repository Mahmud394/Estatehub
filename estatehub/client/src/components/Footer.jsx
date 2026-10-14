import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  MapPin,
  Mail,
  Phone,
  Building2,
  Instagram,
  Facebook,
  Linkedin,
  ChevronRight,
} from 'lucide-react';

const propertyLinks = [
  { label: 'All Properties', path: '/properties' },
  { label: 'For Sale', path: '/properties?purpose=sale' },
  { label: 'For Rent', path: '/properties?purpose=rent' },
  { label: 'Land', path: '/properties?category=land' },
  { label: 'Commercial', path: '/properties?category=commercial' },
];

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <footer className="relative overflow-hidden bg-midnight text-ivory/75">
      {/* Decorative Background */}
      <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full border border-gold/10" />
      <div className="pointer-events-none absolute -right-20 top-32 h-64 w-64 rounded-full border border-gold/10" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top CTA */}
        <div className="relative -top-1 rounded-2xl border border-gold/20 bg-white/[0.04] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold">
                Your next chapter starts here
              </p>

              <h2 className="font-serif text-3xl leading-tight text-ivory sm:text-4xl">
                Find a place
                <br />
                <span className="italic text-gold">to call home.</span>
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-ivory/60">
                Discover properties, connect with trusted brokers, and
                make your next move with confidence.
              </p>
            </div>

            <Link
              to="/properties"
              className="group inline-flex w-fit items-center gap-3 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-midnight transition-all duration-300 hover:bg-ivory"
            >
              Explore Properties
              <ArrowUpRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
              />
            </Link>
          </div>
        </div>

        {/* Main Footer */}
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:py-16">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link to="/" className="group inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-midnight">
                <Building2 size={25} strokeWidth={1.6} />
              </span>

              <span>
                <span className="block font-serif text-2xl tracking-wide text-ivory">
                  Estate<span className="text-gold">Hub.</span>
                </span>
                <span className="mt-0.5 block text-[9px] uppercase tracking-[0.3em] text-ivory/45">
                  Find your space
                </span>
              </span>
            </Link>

            <p className="mt-6 max-w-sm text-sm leading-7 text-ivory/55">
              A smarter way to discover properties, connect with brokers,
              and find spaces that fit your lifestyle. Your property
              journey starts with EstateHub.
            </p>

            <div className="mt-6 flex gap-3">
              {[
                { icon: Instagram, label: 'Instagram' },
                { icon: Facebook, label: 'Facebook' },
                { icon: Linkedin, label: 'LinkedIn' },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-ivory/60 transition-all duration-300 hover:border-gold hover:bg-gold hover:text-midnight"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div className="lg:col-span-2 lg:col-start-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
              Explore
            </h3>

            <ul className="mt-6 space-y-4 text-sm">
              {propertyLinks.map(({ label, path }) => (
                <li key={label}>
                  <Link
                    to={path}
                    className="group inline-flex items-center gap-2 transition-colors hover:text-gold"
                  >
                    <ChevronRight
                      size={14}
                      className="text-gold opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                    />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Brokers */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
              For Brokers
            </h3>

            <ul className="mt-6 space-y-4 text-sm">
              <li>
                <Link
                  to="/register?role=broker"
                  className="transition-colors hover:text-gold"
                >
                  Join as a Broker
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="transition-colors hover:text-gold"
                >
                  Broker Login
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="transition-colors hover:text-gold"
                >
                  Create an Account
                </Link>
              </li>
            </ul>

            <div className="mt-7 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-ivory">
                Own a property?
              </p>
              <Link
                to="/register?role=broker"
                className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-gold hover:text-ivory"
              >
                Start listing
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
              Get in Touch
            </h3>

            <ul className="mt-6 space-y-5 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="mt-0.5 shrink-0 text-gold" />
                <span className="leading-6">
                  Dhaka, Bangladesh
                  <span className="block text-xs text-ivory/40">
                    Find your place, anywhere.
                  </span>
                </span>
              </li>

              <li className="flex items-center gap-3">
                <Mail size={17} className="shrink-0 text-gold" />
                <a
                  href="mailto:info@estatehub.com"
                  className="break-all transition-colors hover:text-gold"
                >
                  info@estatehub.com
                </a>
              </li>

              <li className="flex items-center gap-3">
                <Phone size={17} className="shrink-0 text-gold" />
                <span className="text-ivory/60">
                  Contact your broker
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col gap-4 border-t border-white/10 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ivory/45">
            © {new Date().getFullYear()} EstateHub. All rights reserved.
          </p>

          <p className="text-ivory/40">
            A university capstone project
            <span className="mx-2 text-gold">•</span>
            Built for better property discovery
          </p>

          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-2 text-ivory/60 transition-colors hover:text-gold"
          >
            Back to top
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Oversized Brand Text */}
      <div className="pointer-events-none select-none overflow-hidden px-2">
        <p className="translate-y-[18%] text-center font-serif text-[18vw] font-bold leading-none tracking-tighter text-white/[0.025]">
          ESTATEHUB
        </p>
      </div>
    </footer>
  );
}