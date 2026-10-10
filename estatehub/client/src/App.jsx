import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { api } from './services/api.js';

// Phase 1 placeholder page: proves React -> Express -> MySQL are connected.

function Home() {
  const [status, setStatus] = useState({ loading: true });

  useEffect(() => {
    api('/health')
      .then((data) => setStatus({ data }))
      .catch((error) => setStatus({ error: error.message }));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <p className="text-sm uppercase tracking-widest text-gold">Phase 1 setup</p>
      <h1 className="mt-2 text-5xl font-semibold text-midnight">EstateHub</h1>
      <p className="mt-4 text-gray-600">
        Smart real estate marketplace. The full homepage arrives in Phase 3.
      </p>

      <section aria-live="polite" className="mt-8 rounded border border-gold/40 bg-white p-5">
        <h2 className="text-xl text-forest">Connection check</h2>
        {status.loading && <p className="mt-2">Checking the API…</p>}
        {status.error && (
          <p className="mt-2 text-red-700">Problem: {status.error}</p>
        )}
        {status.data && (
          <p className="mt-2 text-forest">
            API: {status.data.api} · Database: {status.data.database}
          </p>
        )}
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
