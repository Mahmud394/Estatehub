// EstateAI: understands a chat message, searches the REAL listings, and writes a reply.
//
// What is AI and what is not:
//   - understanding the sentence: rule parser (always) + optional LLM (when LLM_API_KEY is set)
//   - finding properties: normal SQL search (searchPublic). Only approved + available listings.
//   - the reply text: written by our own templates from the real search result.
// So the assistant can never make up a property, a price or a broker.
const env = require('../config/env');
const { query } = require('../config/db');
const { searchPublic } = require('./propertyService');
const { parseSearch, clean, hasAny } = require('./ai/nlp');
const { sanitizeFilters, mergeFilters, countActive } = require('./ai/filters');
const { extractWithLlm } = require('./ai/llmClient');
const { bestEntry, isQuestion } = require('./ai/knowledge');

const RESULT_LIMIT = 6;

// ---- vocabulary: the cities and areas that really exist in our listings (cached for a minute) ----
let vocabCache = { at: 0, value: null };
async function loadVocab() {
  if (vocabCache.value && Date.now() - vocabCache.at < 60000) return vocabCache.value;
  const rows = await query(
    `SELECT DISTINCT city, area FROM properties
     WHERE approval_status = 'approved' AND availability_status = 'available' AND city <> '' AND area <> ''`
  );
  const value = { cities: [...new Set(rows.map((r) => r.city))], areas: rows.map((r) => ({ city: r.city, area: r.area })) };
  vocabCache = { at: Date.now(), value };
  return value;
}

// ---- wording helpers ----
function formatBdt(n, purpose) {
  const x = Number(n);
  const t = (v) => Number(v.toFixed(2)).toString();
  let text;
  if (x >= 10000000) text = `৳${t(x / 10000000)} Crore`;
  else if (x >= 100000) text = `৳${t(x / 100000)} Lakh`;
  else text = `৳${x.toLocaleString('en-US')}`;
  return purpose === 'rent' ? `${text}/month` : text;
}

function describe(f) {
  const kind = { apartment: 'apartment', house: 'house', land: 'land', commercial: 'commercial property' }[f.category] || 'property';
  let s = '';
  if (f.bedrooms) s += `${f.bedrooms}+ bedroom `;
  s += kind;
  if (f.purpose) s += f.purpose === 'rent' ? ' for rent' : ' for sale';
  const place = [f.area, f.city].filter(Boolean).join(', ');
  if (place) s += ` in ${place}`;
  if (f.minPrice !== undefined && f.maxPrice !== undefined) s += `, ${formatBdt(f.minPrice)} to ${formatBdt(f.maxPrice, f.purpose)}`;
  else if (f.maxPrice !== undefined) s += `, up to ${formatBdt(f.maxPrice, f.purpose)}`;
  else if (f.minPrice !== undefined) s += `, from ${formatBdt(f.minPrice, f.purpose)}`;
  if (f.minSize !== undefined && f.maxSize !== undefined) s += `, ${f.minSize}-${f.maxSize} sqft`;
  else if (f.minSize !== undefined) s += `, at least ${f.minSize} sqft`;
  else if (f.maxSize !== undefined) s += `, up to ${f.maxSize} sqft`;
  if (f.q) s += `, mentioning "${f.q}"`;
  return s;
}

const RELAX_ORDER = ['q', 'minSize', 'maxSize', 'bedrooms', 'area', 'maxPrice', 'minPrice'];
const FIELD_LABEL = { q: 'keyword', minSize: 'minimum size', maxSize: 'maximum size', bedrooms: 'bedrooms', area: 'area', maxPrice: 'maximum price', minPrice: 'minimum price' };

function searchPath(f) {
  const p = new URLSearchParams();
  for (const k of ['purpose', 'category', 'city', 'area', 'minPrice', 'maxPrice', 'minSize', 'maxSize', 'bedrooms', 'q', 'sort']) {
    if (f[k] !== undefined) p.set(k, String(f[k]));
  }
  const qs = p.toString();
  return qs ? `/properties?${qs}` : '/properties';
}

function suggestionsFor(f) {
  const out = [];
  if (!f.purpose) out.push('Only for rent', 'Only for sale');
  if (f.maxPrice === undefined) out.push(f.purpose === 'rent' ? 'Under 30000' : 'Under 1 crore');
  if (f.sort !== 'price_asc') out.push('Cheapest first');
  out.push('Start over');
  return out.slice(0, 4);
}

const STARTERS = ['3 bedroom apartment for sale in Uttara', 'Flat for rent under 30000', 'Show me land for sale', 'How do I contact a broker?'];
const ADVICE = ['legal', 'lawyer', 'mortgage', 'loan', 'tax', 'invest', 'investment', 'registration', 'deed', 'stamp duty', 'financing'];
const GREETING = /^(hi|hello|hey|hola|salam|assalamu alaikum|assalamualaikum|good (morning|afternoon|evening))\b/;
const SEARCHY = /\b(show|find|search|looking|look for|want|need|list|properties|property|listings|available|options|more)\b/;
const ADVICE_NOTE = ' I cannot give legal or financial advice, so please speak to a qualified lawyer or your bank about that part.';

/**
 * @param {{message: string, context?: object}} input
 * @param {{loadVocab?, search?, extract?}} deps   replaced in tests so they need no database or network
 */
async function chat({ message, context }, deps = {}) {
  const vocabLoader = deps.loadVocab || loadVocab;
  const search = deps.search || searchPublic;
  const extract = deps.extract || ((msg, vocab) => extractWithLlm(msg, vocab, env.llm));

  const vocab = await vocabLoader();
  const text = clean(message);

  const rules = parseSearch(message, vocab);
  const llm = await extract(message, vocab); // null when smart mode is off or failed
  const mode = llm ? 'llm' : 'rules';

  // Rules win where they found something; the LLM fills in what the rules missed.
  const found = { ...(llm ? llm.filters : {}), ...rules.filters };
  const reset = rules.reset || (llm ? llm.reset : false);
  const previous = reset ? {} : sanitizeFilters(context, vocab);
  const advice = hasAny(text, ADVICE);

  const base = { mode, filters: previous, listings: [], total: 0, relaxed: [], suggestions: STARTERS, searchPath: null, link: null };

  const wantsSearch =
    countActive(found) > 0 ||
    (found.sort && countActive(previous) > 0) ||
    (llm && llm.intent === 'search' && !bestEntry(text));

  if (wantsSearch) return { ...base, ...(await runSearch(mergeFilters(previous, found), search, advice)), intent: 'search', mode };

  if (reset) return { ...base, intent: 'reset', reply: 'Okay, starting fresh. What are you looking for?' };

  if (GREETING.test(text)) {
    return { ...base, intent: 'greeting', reply: 'Hello! I am EstateAI. Tell me what kind of property you want, where, and your budget, and I will search the listings on EstateHub.' };
  }

  const faq = bestEntry(text);
  if (faq && (isQuestion(text) || faq.score >= 2)) {
    return { ...base, intent: 'faq', reply: faq.entry.answer, link: faq.entry.link || null };
  }

  if (SEARCHY.test(text)) return { ...base, ...(await runSearch(previous, search, advice)), intent: 'search', mode };

  if (advice) {
    return { ...base, intent: 'advice', reply: 'I cannot give legal or financial advice. Please speak to a qualified lawyer or your bank. I can help you find properties or explain how EstateHub works.' };
  }

  return {
    ...base, intent: 'other',
    reply: 'I can search the listings on EstateHub and explain how the site works. Try describing the property you want, for example "2 bedroom flat for rent in Mirpur under 25000".',
  };
}

async function runSearch(filters, search, advice) {
  const run = (f) => search({ ...f, sort: f.sort || 'newest', page: 1, limit: RESULT_LIMIT });
  let applied = { ...filters };
  let result = await run(applied);
  const relaxed = [];

  // Nothing matched everything? Drop the least important filters one by one and say so clearly.
  if (result.pagination.total === 0) {
    for (const key of RELAX_ORDER) {
      if (applied[key] === undefined) continue;
      applied = { ...applied };
      delete applied[key];
      relaxed.push(key);
      result = await run(applied);
      if (result.pagination.total > 0) break;
    }
  }

  const total = result.pagination.total;
  const wanted = describe(filters);
  const note = advice ? ADVICE_NOTE : '';
  let reply;
  if (total === 0) {
    reply = `I could not find any listings for "${wanted}". Try a different area, a higher budget or fewer filters.${note}`;
  } else if (relaxed.length) {
    reply = `No listing matches everything you asked for ("${wanted}"). I removed the ${relaxed.map((k) => FIELD_LABEL[k]).join(', ')} filter and found ${total} listing${total === 1 ? '' : 's'} for "${describe(applied)}". Check each listing's details before you decide.${note}`;
  } else {
    const order = applied.sort === 'price_asc' ? ' (cheapest first)' : applied.sort === 'price_desc' ? ' (most expensive first)' : '';
    reply = `I found ${total} listing${total === 1 ? '' : 's'} for "${wanted}"${order}.${total > result.items.length ? ` Here are the first ${result.items.length}.` : ''}${note}`;
  }

  return {
    reply,
    filters: applied,
    listings: result.items,
    total,
    relaxed,
    suggestions: suggestionsFor(applied),
    searchPath: total > 0 ? searchPath(applied) : null,
  };
}

function status() {
  return { mode: env.llm.apiKey && typeof globalThis.fetch === 'function' ? 'llm' : 'rules' };
}

module.exports = { chat, status, formatBdt, describe, loadVocab, STARTERS };
