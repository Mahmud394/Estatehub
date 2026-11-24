import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Sparkles, RotateCcw, MapPin, Star } from 'lucide-react';
import { api } from '../services/api.js';
import { formatPrice, formatSize, CATEGORY_LABELS } from '../utils/format.js';
import { getPropertyCardImage } from '../utils/propertyImages.js';

const STARTERS = [
  '3 bedroom apartment for sale in Uttara',
  'Flat for rent under 30000',
  'Which areas do you have?',
  'Best brokers',
  'How do I contact a broker?',
];

const WELCOME = {
  role: 'assistant',
  text: 'Hello! I am EstateAI. Describe the property you want (type, place, budget, bedrooms) and I will search the real listings on EstateHub. You can also ask about prices, areas, brokers, katha to sq ft, or how the site works. If something is not available I will tell you honestly.',
};

// "What I understood": the filters of the last search, as readable chips.
function filterChips(f) {
  const chips = [];
  if (f.purpose) chips.push(f.purpose === 'rent' ? 'For rent' : 'For sale');
  if (f.category) chips.push(CATEGORY_LABELS[f.category]);
  if (f.area) chips.push(`Area: ${f.area}`);
  if (f.city) chips.push(`City: ${f.city}`);
  if (f.bedrooms) chips.push(`Bedrooms: ${f.bedrooms}+`);
  if (f.minPrice !== undefined) chips.push(`Min: ${formatPrice(f.minPrice)}`);
  if (f.maxPrice !== undefined) chips.push(`Max: ${formatPrice(f.maxPrice)}`);
  if (f.minSize !== undefined) chips.push(`Min size: ${formatSize(f.minSize)}`);
  if (f.maxSize !== undefined) chips.push(`Max size: ${formatSize(f.maxSize)}`);
  if (f.q) chips.push(`Keyword: ${f.q}`);
  if (f.sort === 'price_asc') chips.push('Cheapest first');
  if (f.sort === 'price_desc') chips.push('Most expensive first');
  return chips;
}

function ResultCard({ p }) {
  return (
    <li>
      <Link to={`/properties/${p.id}`} className="flex gap-3 rounded border border-gray-200 bg-white p-2 hover:border-forest">
        <img src={getPropertyCardImage(p)} alt="" loading="lazy" className="h-20 w-28 flex-none rounded object-cover" />
        <span className="min-w-0">
          <span className="block font-serif text-lg leading-tight text-forest">{formatPrice(p.price, p.purpose)}</span>
          <span className="block truncate text-sm font-semibold text-gray-900">{p.title}</span>
          <span className="flex items-center gap-1 truncate text-xs text-gray-600">
            <MapPin className="h-3.5 w-3.5 flex-none" aria-hidden="true" />{p.area}, {p.city}
          </span>
          <span className="block text-xs text-gray-500">
            {CATEGORY_LABELS[p.category]} · {formatSize(p.size)}{p.bedrooms != null ? ` · ${p.bedrooms} bed` : ''}
          </span>
        </span>
      </Link>
    </li>
  );
}

function BrokerCard({ b }) {
  return (
    <li>
      <Link to={`/brokers/${b.id}`} className="flex items-center justify-between gap-3 rounded border border-gray-200 bg-white p-3 hover:border-forest">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-gray-900">{b.name}</span>
          <span className="block truncate text-xs text-gray-600">{b.companyName || 'Verified broker'} · {b.listings} listing{b.listings === 1 ? '' : 's'}</span>
        </span>
        <span className="flex flex-none items-center gap-1 text-sm text-gray-800">
          <Star className="h-4 w-4 text-gold" aria-hidden="true" />
          {b.averageRating === null ? 'No reviews' : `${b.averageRating} (${b.reviewCount})`}
        </span>
      </Link>
    </li>
  );
}

// EstateAI chat. The server finds the properties (real database rows); this page only displays them.
export default function Assistant() {
  const [messages, setMessages] = useState([WELCOME]);
  const [context, setContext] = useState({});
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState(null); // 'llm' | 'rules'
  const bottomRef = useRef(null);

  useEffect(() => { api('/ai/status').then((d) => setMode(d.mode)).catch(() => {}); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [messages, busy]);

  // `exact` is set for suggestion buttons that carry real filters: the server searches with them directly.
  const send = async (raw, exact) => {
    const message = (raw ?? text).trim();
    if (!message || busy) return;
    setError(''); setText(''); setBusy(true);
    setMessages((m) => [...m, { role: 'user', text: message }]);
    try {
      const body = exact ? { message, context: exact, apply: true } : { message, context };
      const d = await api('/ai/chat', { method: 'POST', body });
      setContext(d.filters || {});
      setMessages((m) => [...m, { role: 'assistant', text: d.reply, data: d }]);
    } catch (err) {
      setError(err.message || 'EstateAI could not answer right now. Please try again.');
    } finally { setBusy(false); }
  };

  const reset = () => { setMessages([WELCOME]); setContext({}); setError(''); setText(''); };
  const last = messages[messages.length - 1];
  const suggestions = last.role === 'assistant' && last.data ? last.data.suggestions : STARTERS;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl"><Sparkles className="h-7 w-7 text-gold" aria-hidden="true" /> EstateAI</h1>
          <p className="mt-1 text-sm text-gray-600">Describe what you want in your own words. I search the real listings on EstateHub.</p>
        </div>
        <button onClick={reset} className="flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:border-forest">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> New search
        </button>
      </div>

      <div className="mt-5 rounded border border-gray-200 bg-ivory/50">
        <ul className="max-h-[62vh] min-h-[40vh] space-y-4 overflow-y-auto p-4" aria-live="polite" aria-label="Conversation with EstateAI">
          {messages.map((m, i) => (
            <li key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[92%] rounded-lg px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-forest text-white' : 'border border-gray-200 bg-white text-gray-900'}`}>
                <p className="whitespace-pre-line break-words">{m.text}</p>

                {m.data && filterChips(m.data.filters).length > 0 && m.data.intent === 'search' && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500">What I searched for</p>
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {filterChips(m.data.filters).map((c) => (
                        <li key={c} className="rounded border border-forest/40 px-2 py-0.5 text-xs text-forest">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {m.data?.brokers?.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {m.data.brokers.map((b) => <BrokerCard key={b.id} b={b} />)}
                  </ul>
                )}

                {m.data && m.data.listings.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {m.data.listings.map((p) => <ResultCard key={p.id} p={p} />)}
                  </ul>
                )}

                {m.data?.searchPath && m.data.total > m.data.listings.length && (
                  <Link to={m.data.searchPath} className="mt-3 inline-block text-sm font-semibold text-forest underline">
                    See all {m.data.total} on the search page
                  </Link>
                )}
                {m.data?.link && (
                  <Link to={m.data.link.to} className="mt-3 inline-block text-sm font-semibold text-forest underline">{m.data.link.label}</Link>
                )}
              </div>
            </li>
          ))}
          {busy && <li className="text-sm text-gray-500" role="status">EstateAI is searching…</li>}
          <li ref={bottomRef} aria-hidden="true" />
        </ul>

        <div className="border-t border-gray-200 p-3">
          {error && <p role="alert" className="mb-2 rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}
          <ul className="mb-2 flex flex-wrap gap-2" aria-label="Suggested messages">
            {suggestions.map((s) => {
              const label = typeof s === 'string' ? s : s.label; // a suggestion is plain text or { label, filters }
              return (
                <li key={label}>
                  <button onClick={() => (label === 'Start over' ? reset() : send(label, typeof s === 'string' ? undefined : s.filters))} disabled={busy}
                    className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs hover:border-forest disabled:opacity-50">{label}</button>
                </li>
              );
            })}
          </ul>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
            <label htmlFor="ai-input" className="sr-only">Message to EstateAI</label>
            <input id="ai-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} autoComplete="off"
              placeholder="e.g. 2 bedroom flat for rent in Mirpur under 25000"
              className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest" />
            <button disabled={busy || !text.trim()} className="flex items-center gap-1 rounded bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <Send className="h-4 w-4" aria-hidden="true" /> Send
            </button>
          </form>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        EstateAI only uses listings that are approved and available on EstateHub, so prices and averages come only from this site, not the whole market. It cannot give legal or financial advice, so always check the details with the broker.
        {mode === 'llm'
          ? ' Smart mode is on: the text you type here is sent to an AI service to understand it, so please do not type personal information.'
          : mode === 'rules' ? ' Running in basic mode: your messages are understood on our own server and are not sent to any AI service.' : ''}
        {' '}Chats are not saved.
      </p>
    </div>
  );
}
