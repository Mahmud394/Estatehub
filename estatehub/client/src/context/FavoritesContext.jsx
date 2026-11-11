import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const FavoritesContext = createContext({ ids: new Set(), isFavorite: () => false, toggle: async () => {} });

// Keeps the list of the client's favorite property ids, so every heart icon on the page
// knows its state without asking the server one by one.
export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => new Set());
  const latest = useRef(ids);
  latest.current = ids;

  useEffect(() => {
    if (user?.role !== 'client') { setIds(new Set()); return; }
    let cancelled = false;
    api('/favorites/ids')
      .then((list) => { if (!cancelled) setIds(new Set(list)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, user?.role]);

  // Optimistic update: the heart changes at once and is put back if the server says no.
  const toggle = useCallback(async (propertyId) => {
    const was = latest.current.has(propertyId);
    const set = (on) => setIds((prev) => { const next = new Set(prev); if (on) next.add(propertyId); else next.delete(propertyId); return next; });
    set(!was);
    try {
      await api(`/favorites/${propertyId}`, { method: was ? 'DELETE' : 'POST' });
    } catch (err) {
      set(was);
      throw err;
    }
  }, []);

  const value = useMemo(() => ({ ids, isFavorite: (id) => ids.has(id), toggle }), [ids, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
