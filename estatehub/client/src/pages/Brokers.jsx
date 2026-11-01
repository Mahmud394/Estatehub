import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { toQuery } from '../services/api.js';
import BrokerCard from '../components/BrokerCard.jsx';
import Pagination from '../components/Pagination.jsx';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../components/StateViews.jsx';

const input = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest';

export default function Brokers() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const area = params.get('area') || '';
  const page = Number(params.get('page')) || 1;
  const [draft, setDraft] = useState({ q, area });

  const { data, error, loading, reload } = useApi(`/brokers${toQuery({ q, area, page, limit: 12 })}`);

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (draft.q) next.q = draft.q;
    if (draft.area) next.area = draft.area;
    setParams(next); // new search -> back to page 1
  };
  const clear = () => { setDraft({ q: '', area: '' }); setParams({}); };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl">Find a broker</h1>
      <p className="mt-1 text-gray-600">Brokers whose accounts have been reviewed by an admin.</p>

      <form onSubmit={submit} className="mt-6 flex flex-wrap items-end gap-3" aria-label="Search brokers">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="b-q" className="mb-1 block text-sm font-medium">Name or company</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
            <input id="b-q" className={`${input} pl-9`} value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} />
          </div>
        </div>
        <div className="min-w-[200px] flex-1">
          <label htmlFor="b-area" className="mb-1 block text-sm font-medium">Service area</label>
          <input id="b-area" className={input} placeholder="e.g. Uttara" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} />
        </div>
        <button className="rounded bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest/90">Search</button>
        <button type="button" onClick={clear} className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-white">Clear</button>
      </form>

      <section className="mt-8" aria-live="polite">
        {loading && <LoadingSpinner label="Loading brokers…" />}
        {error && <ErrorMessage message={error} onRetry={reload} />}
        {data && data.items.length === 0 && <EmptyState title="No brokers found" message="Try a different name or area." />}
        {data && data.items.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.items.map((b) => <BrokerCard key={b.id} broker={b} />)}
            </div>
            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages}
              onChange={(p) => { const next = new URLSearchParams(params); next.set('page', String(p)); setParams(next); window.scrollTo({ top: 0 }); }} />
          </>
        )}
      </section>
    </div>
  );
}
