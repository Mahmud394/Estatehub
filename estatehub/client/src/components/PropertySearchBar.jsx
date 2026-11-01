import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import { toQuery } from '../services/api.js';

const BUDGETS = {
  sale: [
    ['', 'Any budget'],
    [2500000, 'Up to ৳25 Lakh'],
    [5000000, 'Up to ৳50 Lakh'],
    [8000000, 'Up to ৳80 Lakh'],
    [15000000, 'Up to ৳1.5 Crore'],
    [30000000, 'Up to ৳3 Crore'],
    [50000000, 'Up to ৳5 Crore'],
  ],
  rent: [
    ['', 'Any budget'],
    [15000, 'Up to ৳15,000 / mo'],
    [30000, 'Up to ৳30,000 / mo'],
    [50000, 'Up to ৳50,000 / mo'],
    [100000, 'Up to ৳1,00,000 / mo'],
    [200000, 'Up to ৳2,00,000 / mo'],
  ],
};

const field = 'w-full rounded-sm border border-white/15 bg-white/95 px-3 py-2.5 text-sm text-midnight focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold';
const label = 'mb-1 block text-left text-[11px] font-semibold uppercase tracking-wider text-ivory/70';

// Hero search form. Turns the form into URL filters for /properties.
// `locations` are the real city/area pairs that have listings (from the API).
export default function PropertySearchBar({ locations = [] }) {
  const navigate = useNavigate();
  const [purpose, setPurpose] = useState('sale');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const options = [...new Set([...locations.map((l) => l.city), ...locations.map((l) => l.area)])];

  const changePurpose = (value) => { setPurpose(value); setMaxPrice(''); }; // budgets differ for sale vs rent

  const submit = (e) => {
    e.preventDefault();
    const params = { purpose, category, maxPrice };
    const text = location.trim();
    if (text) {
      const lc = text.toLowerCase();
      const city = locations.find((l) => l.city.toLowerCase() === lc);
      const area = locations.find((l) => l.area.toLowerCase() === lc);
      if (city) params.city = city.city;
      else if (area) params.area = area.area;
      else params.q = text; // free text: search title, description, area and city
    }
    navigate(`/properties${toQuery(params)}`);
  };

  return (
    <form onSubmit={submit} aria-label="Search properties" className="mx-auto w-full max-w-xl rounded-sm border border-white/10 bg-midnight/70 p-4 text-left shadow-2xl backdrop-blur">
      <div role="radiogroup" aria-label="Buy or rent" className="mb-3 grid grid-cols-2 gap-1 rounded-sm bg-white/10 p-1">
        {[['sale', 'Buy'], ['rent', 'Rent']].map(([value, text]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={purpose === value}
            onClick={() => changePurpose(value)}
            className={`rounded-sm py-2 text-sm font-semibold transition-colors ${purpose === value ? 'bg-gold text-midnight' : 'text-ivory hover:bg-white/10'}`}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="hero-location" className={label}>Location</label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-500" aria-hidden="true" />
            <input
              id="hero-location"
              list="hero-location-options"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or area, e.g. Uttara"
              autoComplete="off"
              className={`${field} pl-9`}
            />
            <datalist id="hero-location-options">
              {options.map((o) => <option key={o} value={o} />)}
            </datalist>
          </div>
        </div>
        <div>
          <label htmlFor="hero-type" className={label}>Property type</label>
          <select id="hero-type" value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            <option value="">All types</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="land">Land</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>
        <div>
          <label htmlFor="hero-budget" className={label}>Budget</label>
          <select id="hero-budget" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={field}>
            {BUDGETS[purpose].map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </div>
      </div>

      <button type="submit" className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-gold py-3 text-sm font-semibold text-midnight transition-colors hover:bg-[#d4b57f]">
        <Search className="h-4 w-4" aria-hidden="true" /> Search properties
      </button>
    </form>
  );
}
