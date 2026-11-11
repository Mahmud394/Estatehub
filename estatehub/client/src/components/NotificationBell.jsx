import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../services/api.js';
import { usePolling } from '../hooks/usePolling.js';
import { timeAgo } from '../utils/format.js';

// Other parts of the app (message page, comments page) fire this event after they mark things as
// read, so the red badge updates at once instead of waiting for the next poll.
export const refreshNotifications = () => window.dispatchEvent(new Event('estatehub:notifications'));

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unreadCount: 0 });
  const box = useRef(null);

  const load = useCallback(() => api('/notifications?limit=15').then(setData).catch(() => {}), []);

  useEffect(() => {
    load();
    window.addEventListener('estatehub:notifications', load);
    return () => window.removeEventListener('estatehub:notifications', load);
  }, [load]);
  usePolling(load, 45000);

  // Close on outside click and on Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const openItem = (n) => {
    setOpen(false);
    if (!n.isRead) api(`/notifications/${n.id}/read`, { method: 'POST' }).then(load).catch(() => {});
    navigate(n.link || '/');
  };
  const readAll = () => api('/notifications/read-all', { method: 'POST' }).then(load).catch(() => {});

  const unread = data.unreadCount;
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative rounded p-2 text-ivory hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute right-0 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[4.25rem] z-50 rounded bg-white text-midnight shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="font-sans text-sm font-semibold">Notifications</h2>
            {unread > 0 && (
              <button onClick={readAll} className="flex items-center gap-1 text-xs font-medium text-forest hover:underline">
                <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all as read
              </button>
            )}
          </div>
          {data.items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">You have no notifications yet.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {data.items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openItem(n)}
                    className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left hover:bg-ivory ${n.isRead ? '' : 'bg-forest/5'}`}
                  >
                    <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-red-600'}`} />
                    <span className="min-w-0">
                      <span className={`block text-sm ${n.isRead ? 'text-gray-700' : 'font-semibold'}`}>{n.title}</span>
                      <span className="block text-xs text-gray-500">{timeAgo(n.createdAt)}{n.isRead ? '' : ' · unread'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
