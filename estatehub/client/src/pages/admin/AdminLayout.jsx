import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/listings', label: 'Listings' },
  { to: '/admin/brokers', label: 'Brokers' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/moderation', label: 'Comments & reviews' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/audit', label: 'Audit log' },
];

export default function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl">Admin</h1>
      <nav aria-label="Admin sections" className="mt-5 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => `rounded px-3 py-1.5 text-sm ${isActive ? 'bg-forest text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6"><Outlet /></div>
    </div>
  );
}
