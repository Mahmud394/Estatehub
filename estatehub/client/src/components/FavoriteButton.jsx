import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

// Heart button. Visitors who are not logged in are sent to the login page; brokers and admins do not see it.
// `label` shows text next to the icon (used on the property page); without it the button is a round icon.
export default function FavoriteButton({ propertyId, label = false, className = '' }) {
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);

  if (user && user.role !== 'client') return null;
  const active = !!user && isFavorite(propertyId);

  const onClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    setBusy(true);
    try { await toggle(propertyId); } catch { /* the heart is already put back by the context */ } finally { setBusy(false); }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? 'Remove from favorites' : 'Save to favorites'}
      className={`inline-flex items-center gap-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
        label
          ? 'rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:border-forest'
          : 'h-9 w-9 justify-center rounded-full bg-white/95 text-midnight shadow hover:text-red-600'
      } ${className}`}
    >
      <Heart className={`h-5 w-5 ${active ? 'fill-red-600 text-red-600' : ''}`} aria-hidden="true" />
      {label && <span>{active ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
