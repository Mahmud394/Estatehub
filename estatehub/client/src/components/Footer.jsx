import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';

// Edit these two blocks with your real details before you present or deploy the project.
const CONTACT = { email: 'contact@estatehub.example', place: 'Dhaka, Bangladesh' }; // ".example" = placeholder domain
const SOCIAL_LINKS = [
  // { label: 'Facebook', href: 'https://facebook.com/your-page' },
  // { label: 'LinkedIn', href: 'https://linkedin.com/company/your-page' },
];

<<<<<<< HEAD
const brokerLinks = [
  { label: 'Find a Broker', path: '/brokers' },
  { label: 'Join as a Broker', path: '/register?role=broker' },
  { label: 'Broker Login', path: '/login' },
  { label: 'Create an Account', path: '/register' },
];

const socialLinks = [
  { icon: Instagram, label: 'Instagram', href: null },
  { icon: Facebook, label: 'Facebook', href: null },
  { icon: Linkedin, label: 'LinkedIn', href: null },
];

=======
const col = 'text-sm font-semibold uppercase tracking-wider text-gold';
const link = 'hover:text-gold';

>>>>>>> origin/main
export default function Footer() {
  return (
<<<<<<< HEAD
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
              A smarter real estate marketplace connecting buyers,
              renters, property owners, and brokers. Discover spaces
              that fit your lifestyle with EstateHub.
            </p>

            <Link
              to="/about"
              className="mt-4 inline-flex items-center gap-2 text-sm text-gold transition-colors hover:text-ivory"
            >
              About EstateHub
              <ArrowUpRight size={15} />
            </Link>

            <div className="mt-6 flex gap-3">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href || undefined}
                  aria-label={label}
                  aria-disabled={!href}
                  onClick={(event) => {
                    if (!href) event.preventDefault();
                  }}
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
              {brokerLinks.map(({ label, path }) => (
                <li key={label}>
                  <Link
                    to={path}
                    className="transition-colors hover:text-gold"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-7 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-ivory">
                Own a property?
              </p>
              <p className="mt-1 text-xs leading-5 text-ivory/50">
                Join EstateHub and showcase your listings.
              </p>
              <Link
                to="/register?role=broker"
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-gold hover:text-ivory"
              >
                Start Listing
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
                  href="mailto:contact@estatehub.example"
                  className="break-all transition-colors hover:text-gold"
                >
                  contact@estatehub.example
                </a>
              </li>

              <li className="flex items-start gap-3">
                <Phone size={17} className="mt-0.5 shrink-0 text-gold" />
                <span className="text-ivory/60">
                  Contact your broker for property inquiries.
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

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              to="/terms"
              className="text-ivory/50 transition-colors hover:text-gold"
            >
              Terms & Conditions
            </Link>
            <Link
              to="/privacy"
              className="text-ivory/50 transition-colors hover:text-gold"
            >
              Privacy Policy
            </Link>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex w-fit items-center gap-2 text-ivory/60 transition-colors hover:text-gold"
          >
            Back to top
            <ArrowUpRight size={14} />
          </button>
        </div>

        {/* Demo Disclaimer */}
        <div className="border-t border-white/5 py-4 text-center">
          <p className="text-[11px] leading-5 text-ivory/35">
            A university capstone project
            <span className="mx-2 text-gold">•</span>
            Built for better property discovery
          </p>
=======
    <footer className="bg-midnight text-ivory/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <p className="font-serif text-2xl text-ivory">EstateHub</p>
          <p className="mt-3 text-sm">
            A real estate marketplace connecting buyers, renters and brokers. Built as a university Software Engineering project.
          </p>
          <p className="mt-3 text-sm"><Link className={`${link} underline`} to="/about">About EstateHub</Link></p>
        </div>

        <div>
          <p className={col}>Search</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className={link} to="/properties?purpose=sale">Properties for sale</Link></li>
            <li><Link className={link} to="/properties?purpose=rent">Properties for rent</Link></li>
            <li><Link className={link} to="/properties?category=land">Land</Link></li>
            <li><Link className={link} to="/properties?category=commercial">Commercial</Link></li>
          </ul>
        </div>

        <div>
          <p className={col}>Brokers</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className={link} to="/brokers">Find a broker</Link></li>
            <li><Link className={link} to="/register?role=broker">Register as a broker</Link></li>
            <li><Link className={link} to="/login">Broker login</Link></li>
          </ul>
        </div>

        <div>
          <p className={col}>Contact</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-gold" aria-hidden="true" />{CONTACT.email}</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" aria-hidden="true" />{CONTACT.place}</li>
          </ul>
          {SOCIAL_LINKS.length > 0 && (
            <ul className="mt-4 flex gap-4 text-sm">
              {SOCIAL_LINKS.map((l) => (
                <li key={l.label}><a className={link} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a></li>
              ))}
            </ul>
          )}
>>>>>>> origin/main
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-5 text-center text-xs sm:px-6">
        <p className="space-x-4">
          <Link className={link} to="/terms">Terms and conditions</Link>
          <Link className={link} to="/privacy">Privacy policy</Link>
        </p>
        <p className="mt-2">© {new Date().getFullYear()} EstateHub. Demo project: listings and reviews marked “demo” or “sample” are not real.</p>
      </div>
    </footer>
  );
}
