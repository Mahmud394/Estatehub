import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Building2, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

// Links to pages that do not exist yet (Find a Broker, AI Assistant) are added in later phases,
// so there are no dead links in this build.
const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/properties?purpose=sale', label: 'Buy' },
  { to: '/properties?purpose=rent', label: 'Rent' },
  { to: '/properties?category=commercial', label: 'Commercial' },
];

const DASHBOARD = { broker: '/broker', client: null, admin: null };

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    setMenu(false);
    setOpen(false);
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors hover:text-gold ${isActive ? 'text-gold' : 'text-ivory'}`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all ${
        solid || open ? 'bg-midnight/95 shadow-lg backdrop-blur' : 'bg-midnight/80 backdrop-blur-sm'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Link to="/" className="flex items-center gap-2 text-ivory">
          <Building2 className="h-6 w-6 text-gold" aria-hidden="true" />
          <span className="font-serif text-xl font-semibold tracking-wide">EstateHub</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.label} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenu((m) => !m)}
                aria-expanded={menu}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded border border-gold/50 px-3 py-1.5 text-sm text-ivory hover:border-gold"
              >
                {user.fullName.split(' ')[0]}
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 mt-2 w-48 rounded bg-white py-2 text-sm text-midnight shadow-xl">
                  <p className="px-4 pb-2 text-xs uppercase tracking-wider text-gray-500">{user.role}</p>
                  {DASHBOARD[user.role] && (
                    <Link role="menuitem" to={DASHBOARD[user.role]} onClick={() => setMenu(false)} className="block px-4 py-2 hover:bg-ivory">
                      My dashboard
                    </Link>
                  )}
                  <button role="menuitem" onClick={handleLogout} className="block w-full px-4 py-2 text-left hover:bg-ivory">
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-ivory hover:text-gold">Login</Link>
              <Link to="/register" className="rounded bg-gold px-4 py-2 text-sm font-semibold text-midnight hover:bg-gold/90">
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          className="text-ivory md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="space-y-1 border-t border-white/10 px-4 pb-4 pt-2 md:hidden">
          {LINKS.map((l) => (
            <NavLink key={l.label} to={l.to} end={l.end} onClick={() => setOpen(false)} className={(s) => `block py-2 ${linkClass(s)}`}>
              {l.label}
            </NavLink>
          ))}
          {user ? (
            <>
              {DASHBOARD[user.role] && (
                <Link to={DASHBOARD[user.role]} onClick={() => setOpen(false)} className="block py-2 text-sm text-ivory">My dashboard</Link>
              )}
              <button onClick={handleLogout} className="block py-2 text-sm text-ivory">Log out</button>
            </>
          ) : (
            <div className="flex gap-3 pt-2">
              <Link to="/login" onClick={() => setOpen(false)} className="text-sm text-ivory">Login</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="rounded bg-gold px-4 py-2 text-sm font-semibold text-midnight">Get Started</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
