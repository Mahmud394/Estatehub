import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';

// Edit these two blocks with your real details before you present or deploy the project.
const CONTACT = { email: 'contact@estatehub.example', place: 'Dhaka, Bangladesh' }; // ".example" = placeholder domain
const SOCIAL_LINKS = [
  // { label: 'Facebook', href: 'https://facebook.com/your-page' },
  // { label: 'LinkedIn', href: 'https://linkedin.com/company/your-page' },
];

const col = 'text-sm font-semibold uppercase tracking-wider text-gold';
const link = 'hover:text-gold';

export default function Footer() {
  return (
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
