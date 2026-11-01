import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

const inputCls = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest';

// Controlled by the page: `values` come from the URL, `onApply` writes them back to the URL.
export default function PropertyFilters({ values, onApply, onClear, locations }) {
  const [draft, setDraft] = useState(values);
  useEffect(() => setDraft(values), [values]);

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const submit = (e) => { e.preventDefault(); onApply(draft); };
  const cities = [...new Set(locations.map((l) => l.city))];

  return (
    <form onSubmit={submit} className="space-y-4 rounded border border-gray-200 bg-white p-4" aria-label="Property filters">
      <div>
        <label htmlFor="f-q" className="mb-1 block text-sm font-medium">Keyword</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input id="f-q" className={`${inputCls} pl-9`} value={draft.q || ''} onChange={set('q')} placeholder="Title, area…" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
        <div>
          <label htmlFor="f-purpose" className="mb-1 block text-sm font-medium">Buy or rent</label>
          <select id="f-purpose" className={inputCls} value={draft.purpose || ''} onChange={set('purpose')}>
            <option value="">Any</option>
            <option value="sale">Buy</option>
            <option value="rent">Rent</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-category" className="mb-1 block text-sm font-medium">Property type</label>
          <select id="f-category" className={inputCls} value={draft.category || ''} onChange={set('category')}>
            <option value="">All types</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="land">Land</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
        <div>
          <label htmlFor="f-city" className="mb-1 block text-sm font-medium">City</label>
          <select id="f-city" className={inputCls} value={draft.city || ''} onChange={set('city')}>
            <option value="">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-area" className="mb-1 block text-sm font-medium">Area</label>
          <input id="f-area" className={inputCls} value={draft.area || ''} onChange={set('area')} placeholder="e.g. Uttara" list="area-options" />
          <datalist id="area-options">
            {[...new Set(locations.map((l) => l.area))].map((a) => <option key={a} value={a} />)}
          </datalist>
        </div>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Price (৳ BDT)</legend>
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Minimum price" type="number" min="0" className={inputCls} placeholder="Min" value={draft.minPrice || ''} onChange={set('minPrice')} />
          <input aria-label="Maximum price" type="number" min="0" className={inputCls} placeholder="Max" value={draft.maxPrice || ''} onChange={set('maxPrice')} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Size (sqft)</legend>
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Minimum size" type="number" min="0" className={inputCls} placeholder="Min" value={draft.minSize || ''} onChange={set('minSize')} />
          <input aria-label="Maximum size" type="number" min="0" className={inputCls} placeholder="Max" value={draft.maxSize || ''} onChange={set('maxSize')} />
        </div>
      </fieldset>

      <div>
        <label htmlFor="f-beds" className="mb-1 block text-sm font-medium">Bedrooms (at least)</label>
        <select id="f-beds" className={inputCls} value={draft.bedrooms || ''} onChange={set('bedrooms')}>
          <option value="">Any</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest/90">
          Apply filters
        </button>
        <button type="button" onClick={onClear} className="flex items-center gap-1 rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
          <X className="h-4 w-4" aria-hidden="true" /> Clear
        </button>
      </div>
    </form>
  );
}
