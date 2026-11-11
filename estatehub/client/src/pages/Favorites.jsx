import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { useFavorites } from '../context/FavoritesContext.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../components/StateViews.jsx';

// Saved properties. Un-hearting a card removes it from this list straight away.
export default function Favorites() {
  const { data, error, loading, reload } = useApi('/favorites');
  const { isFavorite } = useFavorites();
  const items = (data || []).filter((p) => isFavorite(p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl">Saved properties</h1>
      {loading && <LoadingSpinner />}
      {error && <div className="mt-4"><ErrorMessage message={error} onRetry={reload} /></div>}
      {data && items.length === 0 && (
        <div className="mt-6">
          <EmptyState title="Nothing saved yet" message="Tap the heart on any property to keep it here."
            action={<Link to="/properties" className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white">Browse properties</Link>} />
        </div>
      )}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => <PropertyCard key={p.id} property={p} />)}
      </div>
    </div>
  );
}
