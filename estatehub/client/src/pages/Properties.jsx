import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, toQuery } from '../services/api.js';
import PropertyCard from '../components/PropertyCard.jsx';
import PropertyFilters from '../components/PropertyFilters.jsx';
import Pagination from '../components/Pagination.jsx';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../components/StateViews.jsx';

const FILTER_KEYS = ['q', 'city', 'area', 'category', 'purpose', 'minPrice', 'maxPrice', 'minSize', 'maxSize', 'bedrooms'];

export default function Properties() {
  // The URL is the single source of truth for filters, so links like /properties?purpose=rent work
  // and the browser Back button behaves naturally.
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ loading: true });
  const [locations, setLocations] = useState([]);

  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])), [params]);
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page')) || 1;

  const load = useCallback(() => {
    setState({ loading: true });
    api(`/properties${toQuery({ ...filters, sort, page, limit: 9 })}`)
      .then((data) => setState({ data }))
      .catch((err) => setState({ error: err.message }));
  }, [filters, sort, page]);

  useEffect(load, [load]);
  useEffect(() => { api('/properties/locations').then(setLocations).catch(() => {}); }, []);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const apply = (draft) => update({ ...draft, page: '' }); // new filters -> back to page 1
  const clear = () => setParams({});

  const hasFilters = FILTER_KEYS.some((k) => filters[k]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl">Properties</h1>
      <p className="mt-1 text-gray-600">Browse approved, available listings.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside><PropertyFilters values={filters} onApply={apply} onClear={clear} locations={locations} /></aside>

        <section aria-live="polite">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              {state.data ? `${state.data.pagination.total} propert${state.data.pagination.total === 1 ? 'y' : 'ies'} found` : ' '}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm">Sort by</label>
              <select id="sort" value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value, page: '' })}
                className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm">
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
            </div>
          </div>

          {state.loading && <LoadingSpinner label="Finding properties…" />}
          {state.error && <ErrorMessage message={state.error} onRetry={load} />}
          {state.data && state.data.items.length === 0 && (
            <EmptyState
              title="No properties match your search"
              message="Try widening your price range or removing a filter."
              action={hasFilters && <button onClick={clear} className="rounded bg-forest px-4 py-2 text-white">Clear all filters</button>}
            />
          )}
          {state.data && state.data.items.length > 0 && (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {state.data.items.map((p) => <PropertyCard key={p.id} property={p} />)}
              </div>
              <Pagination page={state.data.pagination.page} totalPages={state.data.pagination.totalPages}
                onChange={(p) => { update({ page: p > 1 ? String(p) : '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
