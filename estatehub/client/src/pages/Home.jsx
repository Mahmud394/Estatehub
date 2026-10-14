import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import PropertyCard from '../components/PropertyCard.jsx';

// TEMPORARY homepage for Phase 2. Phase 3 replaces this with the full design and the circular property orbit.
export default function Home() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api('/properties?limit=3').then((d) => setItems(d.items)).catch(() => {});
  }, []);

  return (
    <div>
      <section className="bg-midnight px-4 py-24 text-center text-ivory">
        <p className="text-sm uppercase tracking-widest text-gold">EstateHub</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-5xl font-semibold">Find a Place That Feels Like Home.</h1>
        <p className="mx-auto mt-4 max-w-xl text-ivory/80">
          Discover exceptional properties, connect with trusted brokers, and find your next place with EstateHub.
        </p>
        <Link to="/properties" className="mt-8 inline-block rounded bg-gold px-6 py-3 font-semibold text-midnight">Browse properties</Link>
      </section>
      {items.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="text-3xl">Latest listings</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
